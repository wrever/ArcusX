import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }

  const [deployer] = await ethers.getSigners();
  const arcusXEscrow = await ethers.getContractAt("ArcusXEscrow", contractAddress);

  // Parameters for creating an escrow
  const contributor = process.env.CONTRIBUTOR_ADDRESS || deployer.address;
  const token = process.env.TOKEN_ADDRESS || ethers.ZeroAddress; // Use native ETH if not specified
  const totalAmount = process.env.TOTAL_AMOUNT || ethers.parseEther("1.0");
  const milestoneBps = process.env.MILESTONE_BPS?.split(",").map(x => parseInt(x)) || [5000, 5000];
  const submitDeadlines = process.env.SUBMIT_DEADLINES?.split(",").map(x => parseInt(x)) || [
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60
  ];
  const reviewWindows = process.env.REVIEW_WINDOWS?.split(",").map(x => parseInt(x)) || [
    Math.floor(Date.now() / 1000) + 35 * 24 * 60 * 60,
    Math.floor(Date.now() / 1000) + 65 * 24 * 60 * 60
  ];
  const startByDeadline = parseInt(process.env.START_BY_DEADLINE || String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60));
  const arbitrator = process.env.ARBITRATOR_ADDRESS || await arcusXEscrow.globalArbitrator();
  const metaURI = process.env.META_URI || "ipfs://QmTest";

  console.log("Creating escrow with parameters:");
  console.log("- Contributor:", contributor);
  console.log("- Token:", token);
  console.log("- Total Amount:", totalAmount.toString());
  console.log("- Milestone BPS:", milestoneBps);
  console.log("- Submit Deadlines:", submitDeadlines);
  console.log("- Review Windows:", reviewWindows);
  console.log("- Start By Deadline:", startByDeadline);
  console.log("- Arbitrator:", arbitrator);
  console.log("- Meta URI:", metaURI);

  const tx = await arcusXEscrow.connect(deployer).createEscrow(
    contributor,
    token,
    totalAmount,
    milestoneBps,
    submitDeadlines,
    reviewWindows,
    startByDeadline,
    arbitrator,
    metaURI
  );

  const receipt = await tx.wait();
  console.log("Escrow created! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Get the escrow ID from the event
  const event = receipt?.logs.find(log => {
    try {
      const parsed = arcusXEscrow.interface.parseLog(log);
      return parsed?.name === "EscrowCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = arcusXEscrow.interface.parseLog(event);
    const escrowId = parsed?.args[0];
    console.log("Escrow ID:", escrowId.toString());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
