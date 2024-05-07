// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBatchReward {
    function proverRewards(address _prover) external view returns (uint256);
}
