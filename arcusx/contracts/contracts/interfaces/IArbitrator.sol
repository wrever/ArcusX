// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IArbitrator
 * @dev Interface for arbitrator functionality
 */
interface IArbitrator {
    /**
     * @dev Emitted when a dispute is resolved
     * @param escrowId The escrow ID
     * @param milestoneId The milestone ID
     * @param payeeAwardBps The percentage awarded to payee (0-10000)
     * @param reasonCID IPFS CID containing the reason for the decision
     */
    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        uint16 payeeAwardBps,
        string reasonCID
    );

    /**
     * @dev Resolves a dispute with a specific award percentage
     * @param escrowId The escrow ID
     * @param milestoneId The milestone ID
     * @param payeeAwardBps The percentage awarded to payee (0-10000)
     * @param reasonCID IPFS CID containing the reason for the decision
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneId,
        uint16 payeeAwardBps,
        string memory reasonCID
    ) external;

    /**
     * @dev Checks if an address is a valid arbitrator
     * @param arbitrator The address to check
     * @return True if the address is a valid arbitrator
     */
    function isValidArbitrator(address arbitrator) external view returns (bool);

    /**
     * @dev Gets the arbitrator for a specific escrow
     * @param escrowId The escrow ID
     * @return The arbitrator address
     */
    function getArbitrator(uint256 escrowId) external view returns (address);
}
