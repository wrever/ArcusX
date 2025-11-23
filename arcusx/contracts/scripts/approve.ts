import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const escrowId = process.env.ESCROW_ID;
  const milestoneId = process.env.MILESTONE_ID || "0";

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

  console.log("Approving milestone:");
  console.log("- Escrow ID:", escrowId);
  console.log("- Milestone ID:", milestoneId);
  console.log("- Task Creator:", escrow.taskCreator);
  console.log("- Milestone BPS:", milestone.amountBps.toString());
  console.log("- Current State:", milestone.state);
  console.log("- Submitted At:", milestone.submittedAt.toString());

  // Approve milestone
  const tx = await arcusXEscrow.connect(deployer).approveMilestone(escrowId, milestoneId);
  const receipt = await tx.wait();
  
  console.log("Milestone approved! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Verify approval
  const updatedMilestone = await arcusXEscrow.getMilestone(escrowId, milestoneId);
  console.log("Updated milestone state:", updatedMilestone.state);
  console.log("Approved at:", updatedMilestone.approvedAt.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
