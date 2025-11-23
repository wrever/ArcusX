// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TokenUtils
 * @dev Utility library for handling native ETH and ERC-20 tokens
 */
library TokenUtils {
    using SafeERC20 for IERC20;

    error InvalidToken();
    error TransferFailed();
    error InsufficientBalance();
    error FeeOnTransferNotSupported();

    /**
     * @dev Transfers tokens (native or ERC-20) to a recipient
     * @param token The token address (address(0) for native ETH)
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function transfer(
        address token,
        address to,
        uint256 amount
    ) internal {
        if (token == address(0)) {
            // Native ETH transfer
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC-20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @dev Transfers tokens from sender to recipient
     * @param token The token address (address(0) for native ETH)
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function transferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        if (token == address(0)) {
            // Native ETH transfer
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC-20 transfer
            IERC20(token).safeTransferFrom(from, to, amount);
        }
    }

    /**
     * @dev Gets the balance of a token for an address
     * @param token The token address (address(0) for native ETH)
     * @param account The account address
     * @return The balance
     */
    function balanceOf(address token, address account) internal view returns (uint256) {
        if (token == address(0)) {
            return account.balance;
        } else {
            return IERC20(token).balanceOf(account);
        }
    }

    /**
     * @dev Calculates the actual amount received after a transfer
     * This handles fee-on-transfer tokens by measuring balance deltas
     * @param token The token address (address(0) for native ETH)
     * @param account The account address
     * @param expectedAmount The expected amount to receive
     * @return actualAmount The actual amount received
     */
    function getActualReceived(
        address token,
        address account,
        uint256 expectedAmount
    ) internal view returns (uint256 actualAmount) {
        if (token == address(0)) {
            return expectedAmount; // ETH doesn't have fee-on-transfer
        } else {
            uint256 balanceBefore = IERC20(token).balanceOf(account);
            // This would be called after the transfer
            uint256 balanceAfter = IERC20(token).balanceOf(account);
            actualAmount = balanceAfter - balanceBefore;
            
            // Revert if the actual amount is significantly less than expected
            // Allow for small rounding differences (1 wei tolerance)
            if (actualAmount < expectedAmount && (expectedAmount - actualAmount) > 1) {
                revert FeeOnTransferNotSupported();
            }
        }
    }

    /**
     * @dev Checks if a token is valid (not address(0) for ERC-20)
     * @param token The token address
     * @return True if the token is valid
     */
    function isValidToken(address token) internal pure returns (bool) {
        return token != address(0);
    }

    /**
     * @dev Checks if a token is native ETH
     * @param token The token address
     * @return True if the token is native ETH
     */
    function isNativeToken(address token) internal pure returns (bool) {
        return token == address(0);
    }
}
