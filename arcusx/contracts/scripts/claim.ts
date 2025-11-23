import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS || ethers.ZeroAddress;

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }

  const [deployer] = await ethers.getSigners();
  const arcusXEscrow = await ethers.getContractAt("ArcusXEscrow", contractAddress);

  console.log("Claiming funds:");
  console.log("- Claimer:", deployer.address);
  console.log("- Token:", tokenAddress);

  // Check claimable amount
  const claimableAmount = await arcusXEscrow.getClaimableAmount(deployer.address, tokenAddress);
  console.log("Claimable amount:", claimableAmount.toString());

  if (claimableAmount === 0n) {
    console.log("No funds to claim for this token.");
    return;
  }

  // Claim funds
  let tx;
  if (tokenAddress === ethers.ZeroAddress) {
    // Claim native ETH
    console.log("Claiming native ETH...");
    tx = await arcusXEscrow.connect(deployer).claim();
  } else {
    // Claim ERC-20 token
    console.log("Claiming ERC-20 token...");
    tx = await arcusXEscrow.connect(deployer).claimToken(tokenAddress);
  }

  const receipt = await tx.wait();
  console.log("Funds claimed! Transaction hash:", tx.hash);
  console.log("Gas used:", receipt?.gasUsed.toString());

  // Verify claim
  const newClaimableAmount = await arcusXEscrow.getClaimableAmount(deployer.address, tokenAddress);
  console.log("Remaining claimable amount:", newClaimableAmount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
