// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IArcusXEscrow
 * @dev Interface for ArcusX Escrow contract
 */
interface IArcusXEscrow {
    // Enums
    enum EscrowState {
        Created,
        Funded,
        InProgress,
        Closed
    }

    enum MilestoneState {
        Pending,
        Submitted,
        Approved,
        Disputed,
        Released,
        Refunded,
        Resolved
    }

    // Structs
    struct Milestone {
        uint256 amountBps; // Basis points (0-10000)
        uint256 submitDeadline;
        uint256 reviewWindow;
        MilestoneState state;
        string metaURI;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 disputedAt;
        uint256 releasedAt;
        uint256 refundedAt;
        uint16 payeeAwardBps; // For dispute resolution (0-10000)
        string reasonCID; // IPFS CID for dispute reason
    }

    struct Escrow {
        address taskCreator;
        address contributor;
        address token; // address(0) for native ETH
        uint256 totalAmount;
        uint256 fundedAmount;
        uint256 startByDeadline;
        EscrowState state;
        address arbitrator;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 startedAt;
        uint256 closedAt;
        uint256 autoApproveWindow;
        bool autoApproveEnabled;
    }

    struct Evidence {
        address submitter;
        string cid;
        uint256 timestamp;
    }

    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed taskCreator,
        address indexed contributor,
        address token,
        uint256 totalAmount
    );

    event Funded(
        uint256 indexed escrowId,
        address indexed from,
        uint256 amount
    );

    event WorkStarted(uint256 indexed escrowId, address indexed contributor);

    event MilestoneSubmitted(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        string metaURI
    );

    event MilestoneApproved(
        uint256 indexed escrowId,
        uint256 indexed milestoneId
    );

    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        uint256 grossAmount,
        uint256 toContributor,
        uint256 platformFee,
        uint256 referralFee
    );

    event MilestoneRefunded(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        uint256 amountToCreator
    );

    event DisputeOpened(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        address indexed by,
        string evidenceCID
    );

    event EvidenceSubmitted(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        address indexed by,
        string evidenceCID
    );

    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        uint16 payeeAwardBps,
        string reasonCID
    );

    event Claim(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    event FeesUpdated(
        uint16 platformFeeBps,
        uint16 referralFeeBps,
        address treasury
    );

    event TokenAllowlistUpdated(address token, bool allowed);

    event ArbitratorUpdated(address arbitrator, bool globalDefault);

    event AutoApproveWindowUpdated(uint256 seconds);

    // Functions
    function createEscrow(
        address contributor,
        address token,
        uint256 totalAmount,
        uint256[] memory milestoneBps,
        uint256[] memory submitDeadlines,
        uint256[] memory reviewWindows,
        uint256 startByDeadline,
        address arbitrator,
        string memory metaURI
    ) external returns (uint256 escrowId);

    function fundNative(uint256 escrowId) external payable;

    function fundERC20(uint256 escrowId, uint256 amount) external;

    function startWork(uint256 escrowId) external;

    function submitMilestone(
        uint256 escrowId,
        uint256 milestoneId,
        string memory metaURI
    ) external;

    function approveMilestone(uint256 escrowId, uint256 milestoneId) external;

    function openDispute(
        uint256 escrowId,
        uint256 milestoneId,
        string memory evidenceCID
    ) external;

    function submitEvidence(
        uint256 escrowId,
        uint256 milestoneId,
        string memory evidenceCID
    ) external;

    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneId,
        uint16 payeeAwardBps,
        string memory reasonCID
    ) external;

    function release(uint256 escrowId, uint256 milestoneId) external;

    function requestRefund(uint256 escrowId, uint256 milestoneId) external;

    function claim() external;

    function claimToken(address token) external;

    // View functions
    function getEscrow(uint256 escrowId) external view returns (Escrow memory);

    function getMilestone(uint256 escrowId, uint256 milestoneId)
        external
        view
        returns (Milestone memory);

    function getMilestoneCount(uint256 escrowId)
        external
        view
        returns (uint256);

    function getEvidenceCount(
        uint256 escrowId,
        uint256 milestoneId
    ) external view returns (uint256);

    function getEvidence(
        uint256 escrowId,
        uint256 milestoneId,
        uint256 evidenceId
    ) external view returns (Evidence memory);

    function getClaimableAmount(address user, address token)
        external
        view
        returns (uint256);

    function isTokenAllowed(address token) external view returns (bool);

    function getPlatformFeeBps() external view returns (uint16);

    function getReferralFeeBps() external view returns (uint16);

    function getTreasury() external view returns (address);

    function getGlobalArbitrator() external view returns (address);

    function getAutoApproveWindow() external view returns (uint256);
}
