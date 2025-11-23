// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title FeeOnTransferToken
 * @dev ERC-20 token with fee on transfer for testing
 */
contract FeeOnTransferToken is ERC20 {
    uint256 public feePercent; // Fee in basis points (e.g., 100 = 1%)

    constructor(string memory name, string memory symbol, uint8 decimals, uint256 _feePercent) ERC20(name, symbol) {
        feePercent = _feePercent;
        _mint(msg.sender, 1000000 * 10**decimals);
    }

    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 fee = (amount * feePercent) / 10000;
        uint256 transferAmount = amount - fee;
        
        super._transfer(from, to, transferAmount);
        if (fee > 0) {
            super._transfer(from, address(this), fee);
        }
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
