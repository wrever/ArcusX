import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const escrowId = process.env.ESCROW_ID;
  const milestoneId = process.env.MILESTONE_ID || "0";
  const evidenceCID = process.env.EVIDENCE_CID || "ipfs://QmEvidence";

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

  console.log("Opening dispute:");
  console.log("- Escrow ID:", escrowId);
  console.log("- Milestone ID:", milestoneId);
  console.log("- Disputer:", deployer.address);
  console.log("- Milestone BPS:", milestone.amountBps.toString());
  console.log("- Current State:", milestone.state);
  console.log("- Review Window:", milestone.reviewWindow.toString());
  console.log("- Evidence CID:", evidenceCID);

  // Check if within review window
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > milestone.reviewWindow) {
    console.log("Warning: Current time is past the review window!");
    console.log("Current time:", currentTime);
    console.log("Review window ends:", milestone.reviewWindow.toString());
  }

  // Open dispute
  const tx = await arcusXEscrow.connect(deployer).openDispute(escrowId, milestoneId, evidenceCID);
  const receipt = await tx.wait();
  
  console.log("Dispute opened! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Verify dispute
  const updatedMilestone = await arcusXEscrow.getMilestone(escrowId, milestoneId);
  console.log("Updated milestone state:", updatedMilestone.state);
  console.log("Disputed at:", updatedMilestone.disputedAt.toString());

  // Get evidence count
  const evidenceCount = await arcusXEscrow.getEvidenceCount(escrowId, milestoneId);
  console.log("Evidence count:", evidenceCount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
