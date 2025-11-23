// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IArcusXEscrow.sol";
import "./interfaces/IArbitrator.sol";
import "./interfaces/IFeeManager.sol";
import "./libraries/TokenUtils.sol";
import "./libraries/EscrowUtils.sol";

/**
 * @title ArcusXEscrow
 * @dev Production-ready escrow smart contract for EVM chains
 * @author ArcusX
 */
contract ArcusXEscrow is 
    IArcusXEscrow,
    ReentrancyGuard,
    Pausable,
    AccessControl
{
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    // Roles
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Constants
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10%
    uint256 public constant MAX_REFERRAL_FEE_BPS = 500;  // 5%
    uint256 public constant BASIS_POINTS = 10000;

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
    mapping(address => bool) public allowedTokens;
    mapping(uint256 => address) public escrowArbitrators;
    mapping(uint256 => address) public escrowReferrers;
    mapping(uint256 => uint16) public escrowReferralFees;

    // Events (inherited from interface)

    // Errors
    error EscrowNotFound();
    error MilestoneNotFound();
    error InvalidState();
    error InvalidAmount();
    error Unauthorized();
    error TokenNotAllowed();
    error InvalidMilestoneBps();
    error InvalidDeadline();
    error MilestoneNotSubmitted();
    error MilestoneAlreadyApproved();
    error MilestoneAlreadyDisputed();
    error MilestoneNotDisputed();
    error DisputeWindowClosed();
    error InvalidArbitrator();
    error InsufficientFunds();
    error TransferFailed();
    error FeeOnTransferNotSupported();
    error InvalidToken();
    error InsufficientBalance();
    error MilestoneAlreadyReleased();
    error MilestoneAlreadyRefunded();

    constructor(
        address _treasury,
        uint16 _platformFeeBps,
        uint16 _referralFeeBps,
        address _globalArbitrator,
        uint256 _autoApproveWindow
    ) {
        if (_treasury == address(0)) revert InvalidToken();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert InvalidAmount();
        if (_referralFeeBps > MAX_REFERRAL_FEE_BPS) revert InvalidAmount();
        if (_globalArbitrator == address(0)) revert InvalidArbitrator();

        treasury = _treasury;
        platformFeeBps = _platformFeeBps;
        referralFeeBps = _referralFeeBps;
        globalArbitrator = _globalArbitrator;
        autoApproveWindow = _autoApproveWindow;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, _globalArbitrator);
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
        string memory metaURI
    ) external override whenNotPaused returns (uint256 escrowId) {
        if (contributor == address(0)) revert InvalidToken();
        if (totalAmount == 0) revert InvalidAmount();
        if (milestoneBps.length == 0) revert InvalidAmount();
        if (milestoneBps.length != submitDeadlines.length || 
            milestoneBps.length != reviewWindows.length) revert InvalidAmount();
        if (startByDeadline <= block.timestamp) revert InvalidDeadline();
        if (arbitrator == address(0)) arbitrator = globalArbitrator;

        EscrowUtils.validateMilestoneBps(milestoneBps);
        EscrowUtils.validateArbitrator(arbitrator);

        escrowId = nextEscrowId++;
        
        escrows[escrowId] = Escrow({
            taskCreator: msg.sender,
            contributor: contributor,
            token: token,
            totalAmount: totalAmount,
            fundedAmount: 0,
            startByDeadline: startByDeadline,
            state: EscrowState.Created,
            arbitrator: arbitrator,
            createdAt: block.timestamp,
            fundedAt: 0,
            startedAt: 0,
            closedAt: 0,
            autoApproveWindow: autoApproveWindow,
            autoApproveEnabled: true
        });

        // Create milestones
        for (uint256 i = 0; i < milestoneBps.length; i++) {
            if (submitDeadlines[i] <= block.timestamp) revert InvalidDeadline();
            if (reviewWindows[i] <= submitDeadlines[i]) revert InvalidDeadline();
            
            milestones[escrowId][i] = Milestone({
                amountBps: milestoneBps[i],
                submitDeadline: submitDeadlines[i],
                reviewWindow: reviewWindows[i],
                state: MilestoneState.Pending,
                metaURI: "",
                submittedAt: 0,
                approvedAt: 0,
                disputedAt: 0,
                releasedAt: 0,
                refundedAt: 0,
                payeeAwardBps: 0,
                reasonCID: ""
            });
        }

        emit EscrowCreated(escrowId, msg.sender, contributor, token, totalAmount);
    }

    /**
     * @dev Funds escrow with native ETH
     */
    function fundNative(uint256 escrowId) external payable override whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (escrow.token != address(0)) revert InvalidToken();
        if (escrow.state != EscrowState.Created) revert InvalidState();
        if (msg.value != escrow.totalAmount) revert InvalidAmount();

        escrow.fundedAmount = msg.value;
        escrow.state = EscrowState.Funded;
        escrow.fundedAt = block.timestamp;

        emit Funded(escrowId, msg.sender, msg.value);
    }

    /**
     * @dev Funds escrow with ERC-20 tokens
     */
    function fundERC20(uint256 escrowId, uint256 amount) external override whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (escrow.token == address(0)) revert InvalidToken();
        if (escrow.state != EscrowState.Created) revert InvalidState();
        if (amount != escrow.totalAmount) revert InvalidAmount();
        if (!allowedTokens[escrow.token]) revert TokenNotAllowed();

        // Transfer tokens and measure actual received
        uint256 balanceBefore = IERC20(escrow.token).balanceOf(address(this));
        IERC20(escrow.token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = IERC20(escrow.token).balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;

        if (actualReceived < amount && (amount - actualReceived) > 1) {
            revert FeeOnTransferNotSupported();
        }

        escrow.fundedAmount = actualReceived;
        escrow.state = EscrowState.Funded;
        escrow.fundedAt = block.timestamp;

        emit Funded(escrowId, msg.sender, actualReceived);
    }

    /**
     * @dev Contributor starts work on the escrow
     */
    function startWork(uint256 escrowId) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.contributor) revert Unauthorized();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        if (block.timestamp > escrow.startByDeadline) revert InvalidDeadline();

        escrow.state = EscrowState.InProgress;
        escrow.startedAt = block.timestamp;

        emit WorkStarted(escrowId, msg.sender);
    }

    /**
     * @dev Submit a milestone for review
     */
    function submitMilestone(
        uint256 escrowId,
        uint256 milestoneId,
        string memory metaURI
    ) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (msg.sender != escrow.contributor) revert Unauthorized();
        if (escrow.state != EscrowState.InProgress) revert InvalidState();

        EscrowUtils.validateMilestoneSubmission(milestone);

        milestone.state = MilestoneState.Submitted;
        milestone.metaURI = metaURI;
        milestone.submittedAt = block.timestamp;

        emit MilestoneSubmitted(escrowId, milestoneId, metaURI);
    }

    /**
     * @dev Approve a milestone
     */
    function approveMilestone(uint256 escrowId, uint256 milestoneId) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (msg.sender != escrow.taskCreator) revert Unauthorized();

        EscrowUtils.validateMilestoneApproval(milestone);

        milestone.state = MilestoneState.Approved;
        milestone.approvedAt = block.timestamp;

        emit MilestoneApproved(escrowId, milestoneId);
    }

    /**
     * @dev Open a dispute for a milestone
     */
    function openDispute(
        uint256 escrowId,
        uint256 milestoneId,
        string memory evidenceCID
    ) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (msg.sender != escrow.taskCreator && msg.sender != escrow.contributor) revert Unauthorized();

        EscrowUtils.validateDisputeOpening(milestone);

        milestone.state = MilestoneState.Disputed;
        milestone.disputedAt = block.timestamp;

        // Add initial evidence
        evidence[escrowId][milestoneId].push(Evidence({
            submitter: msg.sender,
            cid: evidenceCID,
            timestamp: block.timestamp
        }));

        emit DisputeOpened(escrowId, milestoneId, msg.sender, evidenceCID);
    }

    /**
     * @dev Submit evidence for a dispute
     */
    function submitEvidence(
        uint256 escrowId,
        uint256 milestoneId,
        string memory evidenceCID
    ) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (msg.sender != escrow.taskCreator && msg.sender != escrow.contributor) revert Unauthorized();
        if (milestone.state != MilestoneState.Disputed) revert MilestoneNotDisputed();

        evidence[escrowId][milestoneId].push(Evidence({
            submitter: msg.sender,
            cid: evidenceCID,
            timestamp: block.timestamp
        }));

        emit EvidenceSubmitted(escrowId, milestoneId, msg.sender, evidenceCID);
    }

    /**
     * @dev Resolve a dispute
     */
    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneId,
        uint16 payeeAwardBps,
        string memory reasonCID
    ) external override whenNotPaused {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (!hasRole(ARBITRATOR_ROLE, msg.sender) && msg.sender != escrow.arbitrator) revert Unauthorized();
        if (payeeAwardBps > BASIS_POINTS) revert InvalidAmount();

        EscrowUtils.validateDisputeResolution(milestone);

        milestone.state = MilestoneState.Resolved;
        milestone.payeeAwardBps = payeeAwardBps;
        milestone.reasonCID = reasonCID;

        emit DisputeResolved(escrowId, milestoneId, payeeAwardBps, reasonCID);
    }

    /**
     * @dev Release funds for a milestone
     */
    function release(uint256 escrowId, uint256 milestoneId) external override whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (milestone.state != MilestoneState.Approved && milestone.state != MilestoneState.Resolved) {
            revert InvalidState();
        }
        if (milestone.releasedAt > 0) revert MilestoneAlreadyReleased();

        uint256 milestoneAmount = EscrowUtils.calculateMilestoneAmount(escrow.fundedAmount, milestone.amountBps);
        
        // Calculate fees
        uint256 platformFee = (milestoneAmount * platformFeeBps) / BASIS_POINTS;
        uint256 referralFee = 0;
        uint256 netAmount = milestoneAmount - platformFee;

        // Handle referral fees
        if (escrowReferrers[escrowId] != address(0)) {
            referralFee = (milestoneAmount * escrowReferralFees[escrowId]) / BASIS_POINTS;
            netAmount -= referralFee;
        }

        // Handle dispute resolution
        if (milestone.state == MilestoneState.Resolved) {
            uint256 payeeAmount = (netAmount * milestone.payeeAwardBps) / BASIS_POINTS;
            uint256 payerAmount = netAmount - payeeAmount;
            
            claimableAmounts[escrow.contributor][escrow.token] += payeeAmount;
            claimableAmounts[escrow.taskCreator][escrow.token] += payerAmount;
        } else {
            claimableAmounts[escrow.contributor][escrow.token] += netAmount;
        }

        // Add fees to treasury
        claimableAmounts[treasury][escrow.token] += platformFee;
        if (referralFee > 0) {
            claimableAmounts[escrowReferrers[escrowId]][escrow.token] += referralFee;
        }

        milestone.releasedAt = block.timestamp;

        emit MilestoneReleased(escrowId, milestoneId, milestoneAmount, netAmount, platformFee, referralFee);
    }

    /**
     * @dev Request refund for a milestone
     */
    function requestRefund(uint256 escrowId, uint256 milestoneId) external override whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = milestones[escrowId][milestoneId];
        
        if (escrow.taskCreator == address(0)) revert EscrowNotFound();
        if (milestone.amountBps == 0) revert MilestoneNotFound();
        if (msg.sender != escrow.taskCreator) revert Unauthorized();
        if (milestone.refundedAt > 0) revert MilestoneAlreadyRefunded();

        EscrowUtils.validateMilestoneRefund(milestone);

        uint256 milestoneAmount = EscrowUtils.calculateMilestoneAmount(escrow.fundedAmount, milestone.amountBps);
        
        claimableAmounts[escrow.taskCreator][escrow.token] += milestoneAmount;
        milestone.refundedAt = block.timestamp;

        emit MilestoneRefunded(escrowId, milestoneId, milestoneAmount);
    }

    /**
     * @dev Claim available funds
     */
    function claim() external override whenNotPaused nonReentrant {
        uint256 amount = claimableAmounts[msg.sender][address(0)];
        if (amount == 0) return;

        claimableAmounts[msg.sender][address(0)] = 0;
        address(0).transfer(msg.sender, amount);

        emit Claim(msg.sender, address(0), amount);
    }

    /**
     * @dev Claim available ERC-20 tokens
     */
    function claimToken(address token) external override whenNotPaused nonReentrant {
        uint256 amount = claimableAmounts[msg.sender][token];
        if (amount == 0) return;

        claimableAmounts[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Claim(msg.sender, token, amount);
    }

    // View functions
    function getEscrow(uint256 escrowId) external view override returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getMilestone(uint256 escrowId, uint256 milestoneId) external view override returns (Milestone memory) {
        return milestones[escrowId][milestoneId];
    }

    function getMilestoneCount(uint256 escrowId) external view override returns (uint256) {
        uint256 count = 0;
        while (milestones[escrowId][count].amountBps > 0) {
            count++;
        }
        return count;
    }

    function getEvidenceCount(uint256 escrowId, uint256 milestoneId) external view override returns (uint256) {
        return evidence[escrowId][milestoneId].length;
    }

    function getEvidence(uint256 escrowId, uint256 milestoneId, uint256 evidenceId) external view override returns (Evidence memory) {
        return evidence[escrowId][milestoneId][evidenceId];
    }

    function getClaimableAmount(address user, address token) external view override returns (uint256) {
        return claimableAmounts[user][token];
    }

    function isTokenAllowed(address token) external view override returns (bool) {
        return allowedTokens[token];
    }

    function getPlatformFeeBps() external view override returns (uint16) {
        return platformFeeBps;
    }

    function getReferralFeeBps() external view override returns (uint16) {
        return referralFeeBps;
    }

    function getTreasury() external view override returns (address) {
        return treasury;
    }

    function getGlobalArbitrator() external view override returns (address) {
        return globalArbitrator;
    }

    function getAutoApproveWindow() external view override returns (uint256) {
        return autoApproveWindow;
    }

    // Admin functions
    function updateFees(
        uint16 _platformFeeBps,
        uint16 _referralFeeBps,
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert InvalidAmount();
        if (_referralFeeBps > MAX_REFERRAL_FEE_BPS) revert InvalidAmount();
        if (_treasury == address(0)) revert InvalidToken();

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
            _grantRole(ARBITRATOR_ROLE, arbitrator);
        }
        
        emit ArbitratorUpdated(arbitrator, globalDefault);
    }

    function updateAutoApproveWindow(uint256 seconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoApproveWindow = seconds_;
        emit AutoApproveWindowUpdated(seconds_);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function emergencySweep(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) {
            (bool success, ) = treasury.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(treasury, amount);
        }
    }

    // Reject unexpected ETH
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
