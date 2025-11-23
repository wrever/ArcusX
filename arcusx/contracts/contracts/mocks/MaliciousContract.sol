// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/IArcusXEscrow.sol";

/**
 * @title MaliciousContract
 * @dev Contract that attempts reentrancy attacks for testing
 */
contract MaliciousContract {
    IArcusXEscrow public escrow;
    bool public attacking = false;

    constructor(address _escrow) {
        escrow = IArcusXEscrow(_escrow);
    }

    function startWork(uint256 escrowId) external {
        escrow.startWork(escrowId);
    }

    function submitMilestone(uint256 escrowId, uint256 milestoneId, string memory metaURI) external {
        escrow.submitMilestone(escrowId, milestoneId, metaURI);
    }

    // This function would be called during a reentrancy attack
    function onReceive() external payable {
        if (attacking) {
            // Attempt to call escrow functions during receive
            // This should be blocked by reentrancy protection
        }
    }

    receive() external payable {
        onReceive();
    }
}
