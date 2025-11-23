// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IFeeManager
 * @dev Interface for fee management functionality
 */
interface IFeeManager {
    /**
     * @dev Emitted when fees are updated
     * @param platformFeeBps New platform fee in basis points
     * @param referralFeeBps New referral fee in basis points
     * @param treasury New treasury address
     */
    event FeesUpdated(
        uint16 platformFeeBps,
        uint16 referralFeeBps,
        address treasury
    );

    /**
     * @dev Emitted when a referral is set
     * @param escrowId The escrow ID
     * @param referrer The referrer address
     * @param referralFeeBps The referral fee in basis points
     */
    event ReferralSet(
        uint256 indexed escrowId,
        address indexed referrer,
        uint16 referralFeeBps
    );

    /**
     * @dev Calculates fees for a given amount
     * @param amount The amount to calculate fees for
     * @param escrowId The escrow ID (for referral fees)
     * @return platformFee The platform fee amount
     * @return referralFee The referral fee amount
     * @return netAmount The amount after fees
     */
    function calculateFees(
        uint256 amount,
        uint256 escrowId
    ) external view returns (
        uint256 platformFee,
        uint256 referralFee,
        uint256 netAmount
    );

    /**
     * @dev Sets referral information for an escrow
     * @param escrowId The escrow ID
     * @param referrer The referrer address
     * @param referralFeeBps The referral fee in basis points
     */
    function setReferral(
        uint256 escrowId,
        address referrer,
        uint16 referralFeeBps
    ) external;

    /**
     * @dev Updates platform fees
     * @param platformFeeBps New platform fee in basis points
     * @param referralFeeBps New referral fee in basis points
     * @param treasury New treasury address
     */
    function updateFees(
        uint16 platformFeeBps,
        uint16 referralFeeBps,
        address treasury
    ) external;

    /**
     * @dev Gets current fee configuration
     * @return platformFeeBps Current platform fee in basis points
     * @return referralFeeBps Current referral fee in basis points
     * @return treasury Current treasury address
     */
    function getFeeConfig() external view returns (
        uint16 platformFeeBps,
        uint16 referralFeeBps,
        address treasury
    );

    /**
     * @dev Gets referral information for an escrow
     * @param escrowId The escrow ID
     * @return referrer The referrer address
     * @return referralFeeBps The referral fee in basis points
     */
    function getReferralInfo(uint256 escrowId) external view returns (
        address referrer,
        uint16 referralFeeBps
    );
}
