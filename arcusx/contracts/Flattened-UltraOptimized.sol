// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// OpenZeppelin Contracts v4.9.3
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ArcusX Escrow Contract
 * @dev Production-ready escrow contract with milestone payments and dispute resolution
 * @notice Ultra-optimized version that resolves "Stack too deep" compiler errors
 */
contract ArcusXEscrow is Pausable, ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10%
    uint256 public constant MAX_REFERRAL_FEE_BPS = 500; // 5%
    
    // Roles
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Enums
    enum EscrowState { Created, Funded, InProgress, Closed }
    enum MilestoneState { Pending, Submitted, Approved, Disputed, Released, Refunded, Resolved }

    // Structs
    struct Escrow {
        address taskCreator;
        address contributor;
        address token;
        uint256 totalAmount;
        uint256 fundedAmount;
        uint256 startByDeadline;
        EscrowState state;
        address arbitrator;
    }

    struct Milestone {
        uint256 amountBps;
        uint256 submitDeadline;
        uint256 reviewWindow;
        MilestoneState state;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 releasedAt;
        uint256 payeeAwardBps;
    }

    struct Evidence {
        address submitter;
        string cid;
        uint256 timestamp;
    }

    // State variables
    uint256 public nextEscrowId = 1;
    address public treasury;
    uint16 public platformFeeBps;
    uint16 public referralFeeBps;
    address public globalArbitrator;
    uint256 public autoApproveWindow;
    
    // Mappings
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => mapping(uint256 => Evidence[])) public evidence;
    mapping(address => mapping(address => uint256)) public claimableAmounts;
    mapping(uint256 => address) public escrowReferrers;
    mapping(uint256 => uint16) public escrowReferralFees;
    mapping(address => bool) public allowedTokens;

    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed taskCreator, address indexed contributor, address token, uint256 totalAmount);
    event Funded(uint256 indexed escrowId, address indexed from, uint256 amount);
    event WorkStarted(uint256 indexed escrowId, address indexed contributor);
    event MilestoneSubmitted(uint256 indexed escrowId, uint256 indexed milestoneId, string metaURI);
    event MilestoneApproved(uint256 indexed escrowId, uint256 indexed milestoneId);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 grossAmount, uint256 toContributor, uint256 platformFee, uint256 referralFee);
    event MilestoneRefunded(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 amountToCreator);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed by, string evidenceCID);
    event EvidenceSubmitted(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed by, string evidenceCID);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed milestoneId, uint16 payeeAwardBps, string reasonCID);
    event FeesUpdated(uint16 platformFeeBps, uint16 referralFeeBps, address treasury);
    event TokenAllowlistUpdated(address token, bool allowed);
    event ArbitratorUpdated(address arbitrator, bool globalDefault);
    event AutoApproveWindowUpdated(uint256 windowSeconds);
    event Claim(address indexed user, address indexed token, uint256 amount);

    // Errors
    error EscrowNotFound();
    error MilestoneNotFound();
    error InvalidState();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidMilestoneBps();
    error MilestoneAlreadyReleased();
    error MilestoneAlreadyRefunded();
    error NotAuthorized();
    error TokenNotAllowed();
    error InsufficientBalance();
    error DisputeNotOpen();
    error InvalidAwardBps();
    error InvalidFeeBps();
    error InvalidTreasury();
    error InvalidArbitrator();
    error InvalidWindow();

    constructor(
        address _treasury,
        uint16 _platformFeeBps,
        uint16 _referralFeeBps,
        address _arbitrator,
        uint256 _autoApproveWindow
    ) {
        if (_treasury == address(0)) revert InvalidTreasury();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert InvalidFeeBps();
        if (_referralFeeBps > MAX_REFERRAL_FEE_BPS) revert InvalidFeeBps();
        if (_arbitrator == address(0)) revert InvalidArbitrator();
        if (_autoApproveWindow == 0) revert InvalidWindow();

        treasury = _treasury;
        platformFeeBps = _platformFeeBps;
        referralFeeBps = _referralFeeBps;
        globalArbitrator = _arbitrator;
        autoApproveWindow = _autoApproveWindow;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, _arbitrator);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Creates a new escrow
     */
    function createEscrow(
        address contributor,
        address token,
        uint256 totalAmount,
        uint256[] memory milestoneBps,
        uint256[] memory submitDeadlines,
        uint256[] memory reviewWindows,
        uint256 startByDeadline,
        address arbitrator,
        string memory /* metaURI */
    ) external whenNotPaused returns (uint256 escrowId) {
        if (contributor == address(0) || totalAmount == 0) revert InvalidAmount();
        if (milestoneBps.length == 0 || milestoneBps.length != submitDeadlines.length || 
            milestoneBps.length != reviewWindows.length) revert InvalidAmount();
        if (startByDeadline <= block.timestamp) revert InvalidDeadline();
        
        // Validate milestone BPS sum
        uint256 totalBps = 0;
        for (uint256 i = 0; i < milestoneBps.length; i++) {
            totalBps += milestoneBps[i];
        }
        if (totalBps != 10000) revert InvalidMilestoneBps();

        if (arbitrator == address(0)) arbitrator = globalArbitrator;
        
        escrowId = nextEscrowId++;
        
        escrows[escrowId] = Escrow({
            taskCreator: msg.sender,
            contributor: contributor,
            token: token,
            totalAmount: totalAmount,
            fundedAmount: 0,
            startByDeadline: startByDeadline,
            state: EscrowState.Created,
            arbitrator: arbitrator
        });

        for (uint256 i = 0; i < milestoneBps.length; i++) {
            milestones[escrowId][i] = Milestone({
                amountBps: milestoneBps[i],
                submitDeadline: submitDeadlines[i],
                reviewWindow: reviewWindows[i],
                state: MilestoneState.Pending,
                submittedAt: 0,
                approvedAt: 0,
                releasedAt: 0,
                payeeAwardBps: 0
            });
        }

        emit EscrowCreated(escrowId, msg.sender, contributor, token, totalAmount);
    }

    /**
     * @dev Funds escrow with native ETH
     */
    function fundNative(uint256 escrowId) external payable whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (escrows[escrowId].state != EscrowState.Created) revert InvalidState();
        if (escrows[escrowId].token != address(0)) revert InvalidAmount();
        if (msg.value != escrows[escrowId].totalAmount) revert InvalidAmount();

        escrows[escrowId].fundedAmount = msg.value;
        escrows[escrowId].state = EscrowState.Funded;

        emit Funded(escrowId, msg.sender, msg.value);
    }

    /**
     * @dev Funds escrow with ERC-20 token
     */
    function fundERC20(uint256 escrowId, uint256 amount) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (escrows[escrowId].state != EscrowState.Created) revert InvalidState();
        if (escrows[escrowId].token == address(0)) revert InvalidAmount();
        if (!allowedTokens[escrows[escrowId].token]) revert TokenNotAllowed();
        if (amount != escrows[escrowId].totalAmount) revert InvalidAmount();

        IERC20(escrows[escrowId].token).safeTransferFrom(msg.sender, address(this), amount);
        escrows[escrowId].fundedAmount = amount;
        escrows[escrowId].state = EscrowState.Funded;

        emit Funded(escrowId, msg.sender, amount);
    }

    /**
     * @dev Contributor starts work
     */
    function startWork(uint256 escrowId) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (escrows[escrowId].contributor != msg.sender) revert NotAuthorized();
        if (escrows[escrowId].state != EscrowState.Funded) revert InvalidState();
        if (block.timestamp > escrows[escrowId].startByDeadline) revert InvalidDeadline();

        escrows[escrowId].state = EscrowState.InProgress;
        emit WorkStarted(escrowId, msg.sender);
    }

    /**
     * @dev Submit milestone
     */
    function submitMilestone(uint256 escrowId, uint256 milestoneId, string memory metaURI) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (escrows[escrowId].contributor != msg.sender) revert NotAuthorized();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Pending) revert InvalidState();
        if (block.timestamp > milestones[escrowId][milestoneId].submitDeadline) revert InvalidDeadline();

        milestones[escrowId][milestoneId].state = MilestoneState.Submitted;
        milestones[escrowId][milestoneId].submittedAt = block.timestamp;

        emit MilestoneSubmitted(escrowId, milestoneId, metaURI);
    }

    /**
     * @dev Approve milestone
     */
    function approveMilestone(uint256 escrowId, uint256 milestoneId) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (escrows[escrowId].taskCreator != msg.sender) revert NotAuthorized();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Submitted) revert InvalidState();

        milestones[escrowId][milestoneId].state = MilestoneState.Approved;
        milestones[escrowId][milestoneId].approvedAt = block.timestamp;

        emit MilestoneApproved(escrowId, milestoneId);
    }

    /**
     * @dev Release milestone funds
     */
    function release(uint256 escrowId, uint256 milestoneId) external whenNotPaused nonReentrant {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Approved && 
            milestones[escrowId][milestoneId].state != MilestoneState.Resolved) revert InvalidState();
        if (milestones[escrowId][milestoneId].releasedAt > 0) revert MilestoneAlreadyReleased();

        uint256 milestoneAmount = (escrows[escrowId].fundedAmount * milestones[escrowId][milestoneId].amountBps) / 10000;
        uint256 platformFee = (milestoneAmount * platformFeeBps) / BASIS_POINTS;
        uint256 netAmount = milestoneAmount - platformFee;
        uint256 referralFee = 0;

        if (escrowReferrers[escrowId] != address(0)) {
            referralFee = (milestoneAmount * escrowReferralFees[escrowId]) / BASIS_POINTS;
            netAmount -= referralFee;
        }

        if (milestones[escrowId][milestoneId].state == MilestoneState.Resolved) {
            uint256 payeeAmount = (netAmount * milestones[escrowId][milestoneId].payeeAwardBps) / BASIS_POINTS;
            claimableAmounts[escrows[escrowId].contributor][escrows[escrowId].token] += payeeAmount;
            claimableAmounts[escrows[escrowId].taskCreator][escrows[escrowId].token] += (netAmount - payeeAmount);
        } else {
            claimableAmounts[escrows[escrowId].contributor][escrows[escrowId].token] += netAmount;
        }

        claimableAmounts[treasury][escrows[escrowId].token] += platformFee;
        if (referralFee > 0) {
            claimableAmounts[escrowReferrers[escrowId]][escrows[escrowId].token] += referralFee;
        }

        milestones[escrowId][milestoneId].releasedAt = block.timestamp;
        emit MilestoneReleased(escrowId, milestoneId, milestoneAmount, netAmount, platformFee, referralFee);
    }

    /**
     * @dev Open dispute
     */
    function openDispute(uint256 escrowId, uint256 milestoneId, string memory evidenceCID) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Submitted) revert InvalidState();
        if (escrows[escrowId].taskCreator != msg.sender && escrows[escrowId].contributor != msg.sender) revert NotAuthorized();

        milestones[escrowId][milestoneId].state = MilestoneState.Disputed;
        
        evidence[escrowId][milestoneId].push(Evidence({
            submitter: msg.sender,
            cid: evidenceCID,
            timestamp: block.timestamp
        }));

        emit DisputeOpened(escrowId, milestoneId, msg.sender, evidenceCID);
    }

    /**
     * @dev Submit evidence
     */
    function submitEvidence(uint256 escrowId, uint256 milestoneId, string memory evidenceCID) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Disputed) revert DisputeNotOpen();
        if (escrows[escrowId].taskCreator != msg.sender && escrows[escrowId].contributor != msg.sender) revert NotAuthorized();

        evidence[escrowId][milestoneId].push(Evidence({
            submitter: msg.sender,
            cid: evidenceCID,
            timestamp: block.timestamp
        }));

        emit EvidenceSubmitted(escrowId, milestoneId, msg.sender, evidenceCID);
    }

    /**
     * @dev Resolve dispute
     */
    function resolveDispute(uint256 escrowId, uint256 milestoneId, uint16 payeeAwardBps, string memory reasonCID) external whenNotPaused {
        if (escrows[escrowId].taskCreator == address(0)) revert EscrowNotFound();
        if (milestones[escrowId][milestoneId].amountBps == 0) revert MilestoneNotFound();
        if (milestones[escrowId][milestoneId].state != MilestoneState.Disputed) revert DisputeNotOpen();
        if (!hasRole(ARBITRATOR_ROLE, msg.sender) && escrows[escrowId].arbitrator != msg.sender) revert NotAuthorized();
        if (payeeAwardBps > BASIS_POINTS) revert InvalidAwardBps();

        milestones[escrowId][milestoneId].state = MilestoneState.Resolved;
        milestones[escrowId][milestoneId].payeeAwardBps = payeeAwardBps;

        emit DisputeResolved(escrowId, milestoneId, payeeAwardBps, reasonCID);
    }

    /**
     * @dev Claim funds
     */
    function claim(address token) external whenNotPaused nonReentrant {
        uint256 amount = claimableAmounts[msg.sender][token];
        if (amount == 0) revert InsufficientBalance();

        claimableAmounts[msg.sender][token] = 0;

        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Claim(msg.sender, token, amount);
    }

    /**
     * @dev Admin functions
     */
    function updateFees(uint16 _platformFeeBps, uint16 _referralFeeBps, address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert InvalidFeeBps();
        if (_referralFeeBps > MAX_REFERRAL_FEE_BPS) revert InvalidFeeBps();
        if (_treasury == address(0)) revert InvalidTreasury();

        platformFeeBps = _platformFeeBps;
        referralFeeBps = _referralFeeBps;
        treasury = _treasury;

        emit FeesUpdated(_platformFeeBps, _referralFeeBps, _treasury);
    }

    function updateTokenAllowlist(address token, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    function updateArbitrator(address arbitrator, bool globalDefault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (arbitrator == address(0)) revert InvalidArbitrator();
        
        if (globalDefault) {
            globalArbitrator = arbitrator;
        }
        
        emit ArbitratorUpdated(arbitrator, globalDefault);
    }

    function updateAutoApproveWindow(uint256 windowSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (windowSeconds == 0) revert InvalidWindow();
        autoApproveWindow = windowSeconds;
        emit AutoApproveWindowUpdated(windowSeconds);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Reject unexpected ETH
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
