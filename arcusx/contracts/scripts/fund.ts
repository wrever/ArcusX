import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const escrowId = process.env.ESCROW_ID;
  
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }
  if (!escrowId) {
    throw new Error("ESCROW_ID environment variable is required");
  }

  const [deployer] = await ethers.getSigners();
  const arcusXEscrow = await ethers.getContractAt("ArcusXEscrow", contractAddress);

  // Get escrow details
  const escrow = await arcusXEscrow.getEscrow(escrowId);
  console.log("Escrow details:");
  console.log("- Task Creator:", escrow.taskCreator);
  console.log("- Contributor:", escrow.contributor);
  console.log("- Token:", escrow.token);
  console.log("- Total Amount:", escrow.totalAmount.toString());
  console.log("- State:", escrow.state);

  if (escrow.token === ethers.ZeroAddress) {
    // Fund with native ETH
    console.log("Funding with native ETH...");
    const tx = await arcusXEscrow.connect(deployer).fundNative(escrowId, { 
      value: escrow.totalAmount 
    });
    const receipt = await tx.wait();
    console.log("Funded! Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());
  } else {
    // Fund with ERC-20 token
    console.log("Funding with ERC-20 token...");
    const token = await ethers.getContractAt("IERC20", escrow.token);
    
    // Check allowance
    const allowance = await token.allowance(deployer.address, contractAddress);
    if (allowance < escrow.totalAmount) {
      console.log("Approving token transfer...");
      const approveTx = await token.connect(deployer).approve(contractAddress, escrow.totalAmount);
      await approveTx.wait();
    }

    const tx = await arcusXEscrow.connect(deployer).fundERC20(escrowId, escrow.totalAmount);
    const receipt = await tx.wait();
    console.log("Funded! Transaction hash:", tx.hash);
    console.log("Gas used:", receipt?.gasUsed.toString());
  }

  // Verify funding
  const updatedEscrow = await arcusXEscrow.getEscrow(escrowId);
  console.log("Updated escrow state:", updatedEscrow.state);
  console.log("Funded amount:", updatedEscrow.fundedAmount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
