// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only ERC20 that burns a fee on every transfer.
contract FeeOnTransferMockERC20 is ERC20 {
    uint256 public immutable feeBps;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _feeBps
    ) ERC20(name_, symbol_) {
        feeBps = _feeBps;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from == address(0) || to == address(0) || feeBps == 0) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * feeBps) / 10_000;
        super._update(from, address(0xdead), fee);
        super._update(from, to, value - fee);
    }
}
