import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const escrowId = process.env.ESCROW_ID;
  const milestoneId = process.env.MILESTONE_ID || "0";
  const payeeAwardBps = process.env.PAYEE_AWARD_BPS || "5000"; // 50% to payee
  const reasonCID = process.env.REASON_CID || "ipfs://QmReason";

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }
  if (!escrowId) {
    throw new Error("ESCROW_ID environment variable is required");
  }

  const [deployer] = await ethers.getSigners();
  const arcusXEscrow = await ethers.getContractAt("ArcusXEscrow", contractAddress);

  // Get escrow and milestone details
  const escrow = await arcusXEscrow.getEscrow(escrowId);
  const milestone = await arcusXEscrow.getMilestone(escrowId, milestoneId);

  console.log("Resolving dispute:");
  console.log("- Escrow ID:", escrowId);
  console.log("- Milestone ID:", milestoneId);
  console.log("- Arbitrator:", deployer.address);
  console.log("- Milestone BPS:", milestone.amountBps.toString());
  console.log("- Current State:", milestone.state);
  console.log("- Payee Award BPS:", payeeAwardBps);
  console.log("- Reason CID:", reasonCID);

  // Check if milestone is disputed
  if (milestone.state !== 3) { // MilestoneState.Disputed
    console.log("Warning: Milestone is not in disputed state!");
    console.log("Current state:", milestone.state);
  }

  // Resolve dispute
  const tx = await arcusXEscrow.connect(deployer).resolveDispute(
    escrowId, 
    milestoneId, 
    parseInt(payeeAwardBps), 
    reasonCID
  );
  const receipt = await tx.wait();
  
  console.log("Dispute resolved! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Verify resolution
  const updatedMilestone = await arcusXEscrow.getMilestone(escrowId, milestoneId);
  console.log("Updated milestone state:", updatedMilestone.state);
  console.log("Payee Award BPS:", updatedMilestone.payeeAwardBps.toString());
  console.log("Reason CID:", updatedMilestone.reasonCID);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
