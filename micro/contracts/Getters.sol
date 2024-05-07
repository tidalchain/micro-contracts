// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IBatchReward.sol";
import "./interfaces/IDeposit.sol";
import "./interfaces/IFeePool.sol";
import "./interfaces/IEthToken.sol";
import "./interfaces/IGetters.sol";
import {ETH_TOKEN_ADDRESS, DEPOSIT_ADDRESS, FEE_POOL_ADDRESS, BATCH_REWARD_ADDRESS} from "./Constants.sol";

contract Getters is IGetters {
    struct TokenInfo {
        address token;
        bool enable;
    }

    function mainToken() external view returns (address) {
        return IDeposit(DEPOSIT_ADDRESS).mainToken();
    }

    function getAllToken() external view returns (address[] memory) {
        return IDeposit(DEPOSIT_ADDRESS).getAllToken();
    }

    function tokenEnable(address _token) external view returns (bool) {
        return IDeposit(DEPOSIT_ADDRESS).tokenEnable(_token);
    }

    function getTokens() external view returns (TokenInfo[] memory) {
        address[] memory allToken = IDeposit(DEPOSIT_ADDRESS).getAllToken();
        TokenInfo[] memory tokens = new TokenInfo[](allToken.length);
        for (uint i = 0; i < allToken.length; i++) {
            address token = allToken[i];
            bool enable = IDeposit(DEPOSIT_ADDRESS).tokenEnable(token);
            tokens[i] = TokenInfo(token, enable);
        }
        return tokens;
    }

    function getMinDepositAmount(address _token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getMinDepositAmount(_token);
    }

    function getMinDepositTime(address _token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getMinDepositTime(_token);
    }

    function getDepositAmount(address _prover, address token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getDepositAmount(_prover, token);
    }

    function getDepositTime(address _prover, address token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getDepositTime(_prover, token);
    }

    function getWaitingTime() external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getWaitingTime();
    }

    function getApplyingTime(address _prover, address _token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getApplyingTime(_prover, _token);
    }

    function getDepositInfo(address _prover, address _token) external view returns (Status, uint256, uint256, uint256) {
        ProverTokenDepositInfo memory tokenDepositInfo = IDeposit(DEPOSIT_ADDRESS).getProverTokenDepositInfo(
            _prover,
            _token
        );
        uint256 minDepositTime = IDeposit(DEPOSIT_ADDRESS).getMinDepositTime(_token);
        uint256 waitingTime = IDeposit(DEPOSIT_ADDRESS).getWaitingTime();

        uint256 unlockTime = tokenDepositInfo.depositTime + minDepositTime;

        uint256 withdrawTime = tokenDepositInfo.applyingTime + waitingTime;
        return (tokenDepositInfo.status, tokenDepositInfo.depositAmount, unlockTime, withdrawTime);
    }

    function getWithdrawTime(address _prover, address _token) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getWaitingTime() + IDeposit(DEPOSIT_ADDRESS).getApplyingTime(_prover, _token);
    }

    function score(address _prover) external view returns (uint256) {
        return IDeposit(DEPOSIT_ADDRESS).score(_prover);
    }

    function getProverBaseInfo(
        address _prover
    ) external view returns (Status, uint256, uint256, uint256, uint256, uint256, uint256) {
        return IDeposit(DEPOSIT_ADDRESS).getProverBaseInfo(_prover);
    }

    function getProverTokenDepositInfo(
        address _prover,
        address _token
    ) external view returns (ProverTokenDepositInfo memory) {
        return IDeposit(DEPOSIT_ADDRESS).getProverTokenDepositInfo(_prover, _token);
    }

    function getNotAssignmentBatchList() external view returns (uint256[] memory) {
        return IDeposit(DEPOSIT_ADDRESS).getNotAssignmentBatchList();
    }

    function totalSupply() external view returns (uint256) {
        return IEthToken(ETH_TOKEN_ADDRESS).totalSupply();
    }

    function estimateFeeReward() external view returns (FeeReward[] memory) {
        return IFeePool(FEE_POOL_ADDRESS).estimateFeeReward();
    }

    function getProverStatus(
        address _prover
    ) public view returns (Status, uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        (
            Status status,
            uint256 totalTask,
            uint256 completedTask,
            uint256 failedTask,
            uint256 unProcessedTask,
            uint256 latestProof,
            uint256 avgProofTime
        ) = IDeposit(DEPOSIT_ADDRESS).getProverBaseInfo(_prover);

        uint256 proverRewards = IBatchReward(BATCH_REWARD_ADDRESS).proverRewards(_prover);

        return (
            status,
            totalTask,
            completedTask,
            failedTask,
            unProcessedTask,
            latestProof,
            avgProofTime,
            proverRewards
        );
    }
}
