// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/IArcusXEscrow.sol";

/**
 * @title EscrowUtils
 * @dev Utility library for escrow state management and validation
 */
library EscrowUtils {
    error InvalidState();
    error InvalidMilestoneBps();
    error InvalidDeadline();
    error InvalidAmount();
    error MilestoneNotSubmitted();
    error MilestoneAlreadyApproved();
    error MilestoneAlreadyDisputed();
    error MilestoneNotDisputed();
    error DisputeWindowClosed();
    error InvalidArbitrator();

    /**
     * @dev Validates milestone basis points sum to 10000
     * @param milestoneBps Array of milestone basis points
     */
    function validateMilestoneBps(uint256[] memory milestoneBps) internal pure {
        uint256 totalBps = 0;
        for (uint256 i = 0; i < milestoneBps.length; i++) {
            totalBps += milestoneBps[i];
        }
        if (totalBps != 10000) revert InvalidMilestoneBps();
    }

    /**
     * @dev Validates that a milestone can be submitted
     * @param milestone The milestone to validate
     */
    function validateMilestoneSubmission(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Pending) {
            revert InvalidState();
        }
        if (block.timestamp > milestone.submitDeadline) {
            revert InvalidDeadline();
        }
    }

    /**
     * @dev Validates that a milestone can be approved
     * @param milestone The milestone to validate
     */
    function validateMilestoneApproval(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Submitted) {
            revert MilestoneNotSubmitted();
        }
        if (milestone.state == IArcusXEscrow.MilestoneState.Approved) {
            revert MilestoneAlreadyApproved();
        }
    }

    /**
     * @dev Validates that a dispute can be opened
     * @param milestone The milestone to validate
     */
    function validateDisputeOpening(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Submitted) {
            revert MilestoneNotSubmitted();
        }
        if (milestone.state == IArcusXEscrow.MilestoneState.Disputed) {
            revert MilestoneAlreadyDisputed();
        }
        if (block.timestamp > milestone.reviewWindow) {
            revert DisputeWindowClosed();
        }
    }

    /**
     * @dev Validates that a dispute can be resolved
     * @param milestone The milestone to validate
     */
    function validateDisputeResolution(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Disputed) {
            revert MilestoneNotDisputed();
        }
    }

    /**
     * @dev Validates that a milestone can be released
     * @param milestone The milestone to validate
     */
    function validateMilestoneRelease(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Approved && 
            milestone.state != IArcusXEscrow.MilestoneState.Resolved) {
            revert InvalidState();
        }
    }

    /**
     * @dev Validates that a milestone can be refunded
     * @param milestone The milestone to validate
     */
    function validateMilestoneRefund(IArcusXEscrow.Milestone memory milestone) internal view {
        if (milestone.state != IArcusXEscrow.MilestoneState.Pending &&
            milestone.state != IArcusXEscrow.MilestoneState.Submitted) {
            revert InvalidState();
        }
    }

    /**
     * @dev Calculates the amount for a milestone based on basis points
     * @param totalAmount The total escrow amount
     * @param milestoneBps The milestone basis points
     * @return The milestone amount
     */
    function calculateMilestoneAmount(
        uint256 totalAmount,
        uint256 milestoneBps
    ) internal pure returns (uint256) {
        return (totalAmount * milestoneBps) / 10000;
    }

    /**
     * @dev Checks if auto-approve should trigger
     * @param milestone The milestone to check
     * @param autoApproveWindow The auto-approve window in seconds
     * @return True if auto-approve should trigger
     */
    function shouldAutoApprove(
        IArcusXEscrow.Milestone memory milestone,
        uint256 autoApproveWindow
    ) internal view returns (bool) {
        return milestone.state == IArcusXEscrow.MilestoneState.Submitted &&
               block.timestamp > milestone.submittedAt + autoApproveWindow;
    }

    /**
     * @dev Checks if auto-refund should trigger
     * @param escrow The escrow to check
     * @return True if auto-refund should trigger
     */
    function shouldAutoRefund(IArcusXEscrow.Escrow memory escrow) internal view returns (bool) {
        return escrow.state == IArcusXEscrow.EscrowState.Funded &&
               block.timestamp > escrow.startByDeadline;
    }

    /**
     * @dev Validates arbitrator address
     * @param arbitrator The arbitrator address
     */
    function validateArbitrator(address arbitrator) internal pure {
        if (arbitrator == address(0)) {
            revert InvalidArbitrator();
        }
    }

    /**
     * @dev Validates amount is greater than zero
     * @param amount The amount to validate
     */
    function validateAmount(uint256 amount) internal pure {
        if (amount == 0) {
            revert InvalidAmount();
        }
    }
}
