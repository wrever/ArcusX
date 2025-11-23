import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const escrowId = process.env.ESCROW_ID;
  const milestoneId = process.env.MILESTONE_ID || "0";
  const metaURI = process.env.META_URI || "ipfs://QmMilestoneSubmission";

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

  console.log("Submitting milestone:");
  console.log("- Escrow ID:", escrowId);
  console.log("- Milestone ID:", milestoneId);
  console.log("- Contributor:", escrow.contributor);
  console.log("- Milestone BPS:", milestone.amountBps.toString());
  console.log("- Submit Deadline:", milestone.submitDeadline.toString());
  console.log("- Current State:", milestone.state);
  console.log("- Meta URI:", metaURI);

  // Check if contributor needs to start work first
  if (escrow.state === 1) { // EscrowState.Funded
    console.log("Starting work first...");
    const startTx = await arcusXEscrow.connect(deployer).startWork(escrowId);
    await startTx.wait();
    console.log("Work started! Transaction hash:", startTx.hash);
  }

  // Submit milestone
  const tx = await arcusXEscrow.connect(deployer).submitMilestone(escrowId, milestoneId, metaURI);
  const receipt = await tx.wait();
  
  console.log("Milestone submitted! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Verify submission
  const updatedMilestone = await arcusXEscrow.getMilestone(escrowId, milestoneId);
  console.log("Updated milestone state:", updatedMilestone.state);
  console.log("Submitted at:", updatedMilestone.submittedAt.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
