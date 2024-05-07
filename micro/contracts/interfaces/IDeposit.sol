// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDeposit {
    enum Status {
        UnDeposit,
        Normal,
        Frozen,
        Applying
    }

    struct ProverTokenDepositInfo {
        Status status;
        uint256 applyingTime;
        uint256 depositAmount;
        uint256 depositTime;
    }

    function mainToken() external view returns (address);

    function getMinDepositAmount(address _token) external view returns (uint256);

    function getMinDepositTime(address _token) external view returns (uint256);

    function getWaitingTime() external view returns (uint256);

    function score(address _prover) external view returns (uint256);

    function getProverBaseInfo(
        address _prover
    ) external view returns (Status, uint256, uint256, uint256, uint256, uint256, uint256);

    function getDepositAmount(address _prover, address _token) external view returns (uint256);

    function getDepositTime(address _prover, address _token) external view returns (uint256);

    function getApplyingTime(address _prover, address _token) external view returns (uint256);

    function getAllToken() external view returns (address[] memory);

    function tokenEnable(address _token) external view returns (bool);

    function getProverTokenDepositInfo(
        address _prover,
        address _token
    ) external view returns (ProverTokenDepositInfo memory);

    function getNotAssignmentBatchList() external view returns (uint256[] memory);
}
