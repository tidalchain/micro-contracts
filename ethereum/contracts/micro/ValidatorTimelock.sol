// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./libraries/LibMap.sol";
import "./interfaces/IExecutor.sol";
import "./interfaces/IMicro.sol";
import "../common/interfaces/IBatchEvent.sol";

/// @author ZKAmoeba Micro
/// @custom:security-contact security@zkamoeba.dev
/// @notice Intermediate smart contract between the validator EOA account and the micro smart contract.
/// @dev The primary purpose of this contract is to provide a trustless means of delaying batch execution without
/// modifying the main micro contract. As such, even if this contract is compromised, it will not impact the main
/// contract.
/// @dev micro actively monitors the chain activity and reacts to any suspicious activity by freezing the chain.
/// This allows time for investigation and mitigation before resuming normal operations.
/// @dev The contract overloads all of the 4 methods, that are used in state transition. When the batch is committed,
/// the timestamp is stored for it. Later, when the owner calls the batch execution, the contract checks that batch
/// was committed not earlier than X time ago.
contract ValidatorTimelock is IExecutor, Ownable2Step {
    using LibMap for LibMap.Uint32Map;

    /// @dev Part of the IBase interface. Not used in this contract.
    string public constant override getName = "ValidatorTimelock";

    /// @notice The delay between committing and executing batches is changed.
    event NewExecutionDelay(uint256 _newExecutionDelay);

    /// @notice The validator address is changed.
    event NewValidator(address _oldValidator, address _newValidator);

    /// @dev The main micro smart contract.
    address public immutable microContract;

    /// @dev The mapping of L2 batch number => timestamp when it was committed.
    LibMap.Uint32Map internal committedBatchTimestamp;

    /// @dev The address that can commit/revert/validate/execute batches.
    address public validator;

    /// @dev The delay between committing and executing batches.
    uint32 public executionDelay;

    constructor(address _initialOwner, address _microContract, uint32 _executionDelay, address _validator) {
        _transferOwnership(_initialOwner);
        microContract = _microContract;
        executionDelay = _executionDelay;
        validator = _validator;
    }

    /// @dev Set new validator address.
    function setValidator(address _newValidator) external onlyOwner {
        address oldValidator = validator;
        validator = _newValidator;
        emit NewValidator(oldValidator, _newValidator);
    }

    /// @dev Set the delay between committing and executing batches.
    function setExecutionDelay(uint32 _executionDelay) external onlyOwner {
        executionDelay = _executionDelay;
        emit NewExecutionDelay(_executionDelay);
    }

    /// @notice Checks if the caller is a validator.
    modifier onlyValidator() {
        require(msg.sender == validator, "8h");
        _;
    }

    /// @dev Returns the timestamp when `_l2BatchNumber` was committed.
    function getCommittedBatchTimestamp(uint256 _l2BatchNumber) external view returns (uint256) {
        return committedBatchTimestamp.get(_l2BatchNumber);
    }

    /// @dev Records the timestamp for all provided committed batches and make
    /// a call to the micro contract with the same calldata.
    function commitBatches(
        StoredBatchInfo calldata,
        CommitBatchInfo[] calldata _newBatchesData
    ) external payable onlyValidator {
        require(msg.value > 0, "commitBatches msg.value is zero!");
        (uint256 fee, uint256 lastFee) = _splitFee(msg.value, _newBatchesData.length);

        unchecked {
            // This contract is only a temporary solution, that hopefully will be disabled until 2106 year, so...
            // It is safe to cast.
            uint32 timestamp = uint32(block.timestamp);
            for (uint256 i = 0; i < _newBatchesData.length; ++i) {
                committedBatchTimestamp.set(_newBatchesData[i].batchNumber, timestamp);

                bytes memory l2Calldata = abi.encodeCall(
                    IBatchEvent.onCommitBatch,
                    (_newBatchesData[i].batchNumber, _newBatchesData[i].newStateRoot, msg.sender)
                );

                if (i == _newBatchesData.length - 1) {
                    fee = lastFee;
                }
                IMicro(microContract).onBatchEvent{value: fee}(l2Calldata, new bytes[](0), msg.sender);
            }
        }

        _propagateToMicro();
    }

    /// @dev Make a call to the micro contract with the same calldata.
    /// Note: If the batch is reverted, it needs to be committed first before the execution.
    /// So it's safe to not override the committed batches.
    function revertBatches(uint256) external onlyValidator {
        _propagateToMicro();
    }

    /// @dev Make a call to the micro contract with the same calldata.
    /// Note: We don't track the time when batches are proven, since all information about
    /// the batch is known on the commit stage and the proved is not finalized (may be reverted).
    function proveBatches(
        StoredBatchInfo calldata,
        StoredBatchInfo[] calldata _newBatchesData,
        ProofInput calldata,
        ProverInfo calldata _proverInfo
    ) external payable onlyValidator {
        require(msg.value > 0, "proveBatches msg.value is zero!");
        (uint256 fee, uint256 lastFee) = _splitFee(msg.value, _newBatchesData.length);

        for (uint256 i = 0; i < _newBatchesData.length; ++i) {
            bytes memory l2Calldata = abi.encodeCall(
                IBatchEvent.onProveBatch,
                (
                    _newBatchesData[i].batchNumber,
                    _newBatchesData[i].batchHash,
                    msg.sender,
                    _proverInfo.prover,
                    _proverInfo.timeTaken
                )
            );
            if (i == _newBatchesData.length - 1) {
                fee = lastFee;
            }
            IMicro(microContract).onBatchEvent{value: fee}(l2Calldata, new bytes[](0), msg.sender);
        }

        _propagateToMicro();
    }

    /// @dev Check that batches were committed at least X time ago and
    /// make a call to the micro contract with the same calldata.
    function executeBatches(StoredBatchInfo[] calldata _newBatchesData) external payable onlyValidator {
        require(msg.value > 0, "executeBatches msg.value is zero!");
        (uint256 fee, uint256 lastFee) = _splitFee(msg.value, _newBatchesData.length);

        uint256 delay = executionDelay; // uint32
        unchecked {
            for (uint256 i = 0; i < _newBatchesData.length; ++i) {
                uint256 commitBatchTimestamp = committedBatchTimestamp.get(_newBatchesData[i].batchNumber);

                bytes memory l2Calldata = abi.encodeCall(
                    IBatchEvent.onExecuteBatch,
                    (_newBatchesData[i].batchNumber, _newBatchesData[i].batchHash, msg.sender)
                );
                if (i == _newBatchesData.length - 1) {
                    fee = lastFee;
                }
                IMicro(microContract).onBatchEvent{value: fee}(l2Calldata, new bytes[](0), msg.sender);

                // Note: if the `commitBatchTimestamp` is zero, that means either:
                // * The batch was committed, but not through this contract.
                // * The batch wasn't committed at all, so execution will fail in the micro contract.
                // We allow executing such batches.
                require(block.timestamp >= commitBatchTimestamp + delay, "5c"); // The delay is not passed
            }
        }

        _propagateToMicro();
    }

    /// @dev Call the micro contract with the same calldata as this contract was called.
    /// Note: it is called the micro contract, not delegatecalled!
    function _propagateToMicro() internal {
        address contractAddress = microContract;
        assembly {
            // Copy function signature and arguments from calldata at zero position into memory at pointer position
            calldatacopy(0, 0, calldatasize())
            // Call method of the micro contract returns 0 on error
            let result := call(gas(), contractAddress, 0, 0, calldatasize(), 0, 0)
            // Get the size of the last return data
            let size := returndatasize()
            // Copy the size length of bytes from return data at zero position to pointer position
            returndatacopy(0, 0, size)
            // Depending on the result value
            switch result
            case 0 {
                // End execution and revert state changes
                revert(0, size)
            }
            default {
                // Return data with length of size at pointers position
                return(0, size)
            }
        }
    }

    function _splitFee(uint256 _totalFee, uint256 _length) internal pure returns (uint256, uint256) {
        uint256 fee = _totalFee / _length;
        uint256 lastFee = fee + (_totalFee - fee * _length);
        return (fee, lastFee);
    }
}
