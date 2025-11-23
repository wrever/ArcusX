import { expect } from "chai";
import { ethers } from "hardhat";
import { ArcusXEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ArcusXEscrow", function () {
  let arcusXEscrow: ArcusXEscrow;
  let owner: SignerWithAddress;
  let taskCreator: SignerWithAddress;
  let contributor: SignerWithAddress;
  let arbitrator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let referrer: SignerWithAddress;
  let other: SignerWithAddress;

  const PLATFORM_FEE_BPS = 250; // 2.5%
  const REFERRAL_FEE_BPS = 100; // 1%
  const AUTO_APPROVE_WINDOW = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [owner, taskCreator, contributor, arbitrator, treasury, referrer, other] = await ethers.getSigners();

    const ArcusXEscrowFactory = await ethers.getContractFactory("ArcusXEscrow");
    arcusXEscrow = await ArcusXEscrowFactory.deploy(
      treasury.address,
      PLATFORM_FEE_BPS,
      REFERRAL_FEE_BPS,
      arbitrator.address,
      AUTO_APPROVE_WINDOW
    );
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await arcusXEscrow.treasury()).to.equal(treasury.address);
      expect(await arcusXEscrow.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
      expect(await arcusXEscrow.referralFeeBps()).to.equal(REFERRAL_FEE_BPS);
      expect(await arcusXEscrow.globalArbitrator()).to.equal(arbitrator.address);
      expect(await arcusXEscrow.autoApproveWindow()).to.equal(AUTO_APPROVE_WINDOW);
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await arcusXEscrow.DEFAULT_ADMIN_ROLE();
      expect(await arcusXEscrow.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Escrow Creation", function () {
    it("Should create escrow with native ETH", async function () {
      const totalAmount = ethers.parseEther("1.0");
      const milestoneBps = [5000, 5000]; // 50% each
      const submitDeadlines = [
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60  // 60 days
      ];
      const reviewWindows = [
        Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60, // 35 days
        Math.floor(Date.now() / 1000) + 65 * 24 * 60 * 60  // 65 days
      ];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

      await expect(
        arcusXEscrow.connect(taskCreator).createEscrow(
          contributor.address,
          ethers.ZeroAddress, // Native ETH
          totalAmount,
          milestoneBps,
          submitDeadlines,
          reviewWindows,
          startByDeadline,
          arbitrator.address,
          "ipfs://QmTest"
        )
      ).to.emit(arcusXEscrow, "EscrowCreated")
        .withArgs(1, taskCreator.address, contributor.address, ethers.ZeroAddress, totalAmount);
    });

    it("Should create escrow with ERC-20 token", async function () {
      // Deploy mock ERC-20 token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20Factory.deploy("Test Token", "TEST", 18);

      const totalAmount = ethers.parseEther("100.0");
      const milestoneBps = [10000]; // 100%
      const submitDeadlines = [Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60];
      const reviewWindows = [Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      // Allow the token
      await arcusXEscrow.updateTokenAllowlist(mockToken.address, true);

      await expect(
        arcusXEscrow.connect(taskCreator).createEscrow(
          contributor.address,
          mockToken.address,
          totalAmount,
          milestoneBps,
          submitDeadlines,
          reviewWindows,
          startByDeadline,
          arbitrator.address,
          "ipfs://QmTest"
        )
      ).to.emit(arcusXEscrow, "EscrowCreated")
        .withArgs(1, taskCreator.address, contributor.address, mockToken.address, totalAmount);
    });

    it("Should revert with invalid milestone BPS", async function () {
      const totalAmount = ethers.parseEther("1.0");
      const milestoneBps = [3000, 3000]; // Sum = 6000, should be 10000
      const submitDeadlines = [
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60
      ];
      const reviewWindows = [
        Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 65 * 24 * 60 * 60
      ];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await expect(
        arcusXEscrow.connect(taskCreator).createEscrow(
          contributor.address,
          ethers.ZeroAddress,
          totalAmount,
          milestoneBps,
          submitDeadlines,
          reviewWindows,
          startByDeadline,
          arbitrator.address,
          "ipfs://QmTest"
        )
      ).to.be.revertedWithCustomError(arcusXEscrow, "InvalidMilestoneBps");
    });
  });

  describe("Funding", function () {
    let escrowId: number;
    const totalAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      const milestoneBps = [5000, 5000];
      const submitDeadlines = [
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60
      ];
      const reviewWindows = [
        Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 65 * 24 * 60 * 60
      ];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await arcusXEscrow.connect(taskCreator).createEscrow(
        contributor.address,
        ethers.ZeroAddress,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator.address,
        "ipfs://QmTest"
      );

      escrowId = 1;
    });

    it("Should fund with native ETH", async function () {
      await expect(
        arcusXEscrow.connect(taskCreator).fundNative(escrowId, { value: totalAmount })
      ).to.emit(arcusXEscrow, "Funded")
        .withArgs(escrowId, taskCreator.address, totalAmount);

      const escrow = await arcusXEscrow.getEscrow(escrowId);
      expect(escrow.fundedAmount).to.equal(totalAmount);
      expect(escrow.state).to.equal(1); // EscrowState.Funded
    });

    it("Should fund with ERC-20 token", async function () {
      // Deploy and allow token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20Factory.deploy("Test Token", "TEST", 18);
      await arcusXEscrow.updateTokenAllowlist(mockToken.address, true);

      // Create new escrow with ERC-20
      const totalAmountERC20 = ethers.parseEther("100.0");
      const milestoneBps = [10000];
      const submitDeadlines = [Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60];
      const reviewWindows = [Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await arcusXEscrow.connect(taskCreator).createEscrow(
        contributor.address,
        mockToken.address,
        totalAmountERC20,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator.address,
        "ipfs://QmTest"
      );

      // Mint tokens to task creator
      await mockToken.mint(taskCreator.address, totalAmountERC20);
      await mockToken.connect(taskCreator).approve(arcusXEscrow.address, totalAmountERC20);

      await expect(
        arcusXEscrow.connect(taskCreator).fundERC20(2, totalAmountERC20)
      ).to.emit(arcusXEscrow, "Funded")
        .withArgs(2, taskCreator.address, totalAmountERC20);
    });

    it("Should revert with wrong amount", async function () {
      const wrongAmount = ethers.parseEther("0.5");
      await expect(
        arcusXEscrow.connect(taskCreator).fundNative(escrowId, { value: wrongAmount })
      ).to.be.revertedWithCustomError(arcusXEscrow, "InvalidAmount");
    });

    it("Should revert with unauthorized funding", async function () {
      await expect(
        arcusXEscrow.connect(other).fundNative(escrowId, { value: totalAmount })
      ).to.be.revertedWithCustomError(arcusXEscrow, "Unauthorized");
    });
  });

  describe("Workflow", function () {
    let escrowId: number;
    const totalAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      const milestoneBps = [5000, 5000];
      const submitDeadlines = [
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60
      ];
      const reviewWindows = [
        Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60,
        Math.floor(Date.now() / 1000) + 65 * 24 * 60 * 60
      ];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await arcusXEscrow.connect(taskCreator).createEscrow(
        contributor.address,
        ethers.ZeroAddress,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator.address,
        "ipfs://QmTest"
      );

      escrowId = 1;
      await arcusXEscrow.connect(taskCreator).fundNative(escrowId, { value: totalAmount });
    });

    it("Should complete full workflow: start -> submit -> approve -> release -> claim", async function () {
      // Start work
      await expect(
        arcusXEscrow.connect(contributor).startWork(escrowId)
      ).to.emit(arcusXEscrow, "WorkStarted")
        .withArgs(escrowId, contributor.address);

      // Submit milestone
      await expect(
        arcusXEscrow.connect(contributor).submitMilestone(escrowId, 0, "ipfs://QmMilestone1")
      ).to.emit(arcusXEscrow, "MilestoneSubmitted")
        .withArgs(escrowId, 0, "ipfs://QmMilestone1");

      // Approve milestone
      await expect(
        arcusXEscrow.connect(taskCreator).approveMilestone(escrowId, 0)
      ).to.emit(arcusXEscrow, "MilestoneApproved")
        .withArgs(escrowId, 0);

      // Release milestone
      await expect(
        arcusXEscrow.connect(taskCreator).release(escrowId, 0)
      ).to.emit(arcusXEscrow, "MilestoneReleased");

      // Check claimable amounts
      const contributorClaimable = await arcusXEscrow.getClaimableAmount(contributor.address, ethers.ZeroAddress);
      const treasuryClaimable = await arcusXEscrow.getClaimableAmount(treasury.address, ethers.ZeroAddress);

      expect(contributorClaimable).to.be.gt(0);
      expect(treasuryClaimable).to.be.gt(0);

      // Claim funds
      const contributorBalanceBefore = await ethers.provider.getBalance(contributor.address);
      await arcusXEscrow.connect(contributor).claim();
      const contributorBalanceAfter = await ethers.provider.getBalance(contributor.address);

      expect(contributorBalanceAfter).to.be.gt(contributorBalanceBefore);
    });

    it("Should handle dispute workflow", async function () {
      // Start work and submit milestone
      await arcusXEscrow.connect(contributor).startWork(escrowId);
      await arcusXEscrow.connect(contributor).submitMilestone(escrowId, 0, "ipfs://QmMilestone1");

      // Open dispute
      await expect(
        arcusXEscrow.connect(taskCreator).openDispute(escrowId, 0, "ipfs://QmEvidence1")
      ).to.emit(arcusXEscrow, "DisputeOpened")
        .withArgs(escrowId, 0, taskCreator.address, "ipfs://QmEvidence1");

      // Submit additional evidence
      await expect(
        arcusXEscrow.connect(contributor).submitEvidence(escrowId, 0, "ipfs://QmEvidence2")
      ).to.emit(arcusXEscrow, "EvidenceSubmitted")
        .withArgs(escrowId, 0, contributor.address, "ipfs://QmEvidence2");

      // Resolve dispute
      await expect(
        arcusXEscrow.connect(arbitrator).resolveDispute(escrowId, 0, 7000, "ipfs://QmReason") // 70% to contributor
      ).to.emit(arcusXEscrow, "DisputeResolved")
        .withArgs(escrowId, 0, 7000, "ipfs://QmReason");

      // Release milestone
      await arcusXEscrow.connect(taskCreator).release(escrowId, 0);

      // Check that funds are split according to arbitrator decision
      const contributorClaimable = await arcusXEscrow.getClaimableAmount(contributor.address, ethers.ZeroAddress);
      const taskCreatorClaimable = await arcusXEscrow.getClaimableAmount(taskCreator.address, ethers.ZeroAddress);

      expect(contributorClaimable).to.be.gt(0);
      expect(taskCreatorClaimable).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should update fees", async function () {
      const newPlatformFeeBps = 300;
      const newReferralFeeBps = 150;
      const newTreasury = other.address;

      await expect(
        arcusXEscrow.updateFees(newPlatformFeeBps, newReferralFeeBps, newTreasury)
      ).to.emit(arcusXEscrow, "FeesUpdated")
        .withArgs(newPlatformFeeBps, newReferralFeeBps, newTreasury);

      expect(await arcusXEscrow.platformFeeBps()).to.equal(newPlatformFeeBps);
      expect(await arcusXEscrow.referralFeeBps()).to.equal(newReferralFeeBps);
      expect(await arcusXEscrow.treasury()).to.equal(newTreasury);
    });

    it("Should update token allowlist", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20Factory.deploy("Test Token", "TEST", 18);

      await expect(
        arcusXEscrow.updateTokenAllowlist(mockToken.address, true)
      ).to.emit(arcusXEscrow, "TokenAllowlistUpdated")
        .withArgs(mockToken.address, true);

      expect(await arcusXEscrow.isTokenAllowed(mockToken.address)).to.be.true;
    });

    it("Should pause and unpause", async function () {
      await arcusXEscrow.pause();
      expect(await arcusXEscrow.paused()).to.be.true;

      await arcusXEscrow.unpause();
      expect(await arcusXEscrow.paused()).to.be.false;
    });

    it("Should revert with unauthorized admin actions", async function () {
      await expect(
        arcusXEscrow.connect(other).updateFees(100, 50, other.address)
      ).to.be.revertedWithAccessControl(arcusXEscrow.address, other.address, await arcusXEscrow.DEFAULT_ADMIN_ROLE());
    });
  });

  describe("Edge Cases", function () {
    it("Should handle fee-on-transfer tokens", async function () {
      // Deploy fee-on-transfer token
      const FeeOnTransferTokenFactory = await ethers.getContractFactory("FeeOnTransferToken");
      const feeToken = await FeeOnTransferTokenFactory.deploy("Fee Token", "FEE", 18, 100); // 1% fee

      await arcusXEscrow.updateTokenAllowlist(feeToken.address, true);

      const totalAmount = ethers.parseEther("100.0");
      const milestoneBps = [10000];
      const submitDeadlines = [Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60];
      const reviewWindows = [Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await arcusXEscrow.connect(taskCreator).createEscrow(
        contributor.address,
        feeToken.address,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator.address,
        "ipfs://QmTest"
      );

      // Mint tokens to task creator
      await feeToken.mint(taskCreator.address, totalAmount);
      await feeToken.connect(taskCreator).approve(arcusXEscrow.address, totalAmount);

      // This should revert due to fee-on-transfer
      await expect(
        arcusXEscrow.connect(taskCreator).fundERC20(1, totalAmount)
      ).to.be.revertedWithCustomError(arcusXEscrow, "FeeOnTransferNotSupported");
    });

    it("Should handle reentrancy attacks", async function () {
      // Deploy malicious contract
      const MaliciousContractFactory = await ethers.getContractFactory("MaliciousContract");
      const maliciousContract = await MaliciousContractFactory.deploy(arcusXEscrow.address);

      const totalAmount = ethers.parseEther("1.0");
      const milestoneBps = [10000];
      const submitDeadlines = [Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60];
      const reviewWindows = [Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60];
      const startByDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await arcusXEscrow.connect(taskCreator).createEscrow(
        maliciousContract.address,
        ethers.ZeroAddress,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator.address,
        "ipfs://QmTest"
      );

      await arcusXEscrow.connect(taskCreator).fundNative(1, { value: totalAmount });
      await maliciousContract.startWork(1);
      await maliciousContract.submitMilestone(1, 0, "ipfs://QmTest");
      await arcusXEscrow.connect(taskCreator).approveMilestone(1, 0);

      // This should not revert due to reentrancy protection
      await expect(
        arcusXEscrow.connect(taskCreator).release(1, 0)
      ).to.not.be.reverted;
    });
  });
});
