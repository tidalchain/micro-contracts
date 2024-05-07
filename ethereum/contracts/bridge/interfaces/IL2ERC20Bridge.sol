// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

/// @author ZKAmoeba Micro
interface IL2ERC20Bridge {
    function initialize(address _l1Bridge, bytes32 _l2TokenProxyBytecodeHash, address _governor) external;
}
