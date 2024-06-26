// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "./interfaces/IAllowList.sol";

/// @author ZKAmoeba Micro
/// @custom:security-contact security@zkamoeba.dev
abstract contract AllowListed {
    modifier senderCanCallFunction(IAllowList _allowList) {
        // Preventing the stack too deep error
        {
            require(_allowList.canCall(msg.sender, address(this), msg.sig), "nr");
        }
        _;
    }
}
