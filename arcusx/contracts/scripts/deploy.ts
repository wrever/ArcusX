import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ArcusX Escrow Suite...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deployment parameters
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || "250"); // 2.5%
  const referralFeeBps = parseInt(process.env.REFERRAL_FEE_BPS || "100"); // 1%
  const globalArbitrator = process.env.ARBITRATOR_ADDRESS || deployer.address;
  const autoApproveWindow = parseInt(process.env.AUTO_APPROVE_WINDOW || "604800"); // 7 days

  console.log("Deployment parameters:");
  console.log("- Treasury:", treasury);
  console.log("- Platform Fee BPS:", platformFeeBps);
  console.log("- Referral Fee BPS:", referralFeeBps);
  console.log("- Global Arbitrator:", globalArbitrator);
  console.log("- Auto Approve Window:", autoApproveWindow, "seconds");

  // Deploy ArcusXEscrow
  const ArcusXEscrowFactory = await ethers.getContractFactory("ArcusXEscrow");
  const arcusXEscrow = await ArcusXEscrowFactory.deploy(
    treasury,
    platformFeeBps,
    referralFeeBps,
    globalArbitrator,
    autoApproveWindow
  );

  await arcusXEscrow.waitForDeployment();
  const arcusXEscrowAddress = await arcusXEscrow.getAddress();

  console.log("ArcusXEscrow deployed to:", arcusXEscrowAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  console.log("Treasury:", await arcusXEscrow.treasury());
  console.log("Platform Fee BPS:", await arcusXEscrow.platformFeeBps());
  console.log("Referral Fee BPS:", await arcusXEscrow.referralFeeBps());
  console.log("Global Arbitrator:", await arcusXEscrow.globalArbitrator());
  console.log("Auto Approve Window:", await arcusXEscrow.autoApproveWindow());

  // Add common tokens to allowlist if specified
  const allowedTokens = process.env.ALLOWED_TOKENS?.split(",") || [];
  for (const tokenAddress of allowedTokens) {
    if (tokenAddress && tokenAddress !== "") {
      console.log(`Adding token to allowlist: ${tokenAddress}`);
      await arcusXEscrow.updateTokenAllowlist(tokenAddress, true);
    }
  }

  console.log("\nDeployment completed successfully!");
  console.log("Contract address:", arcusXEscrowAddress);
  console.log("Network:", await ethers.provider.getNetwork().then(n => n.name));
  console.log("Chain ID:", await ethers.provider.getNetwork().then(n => n.chainId));

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    chainId: await ethers.provider.getNetwork().then(n => n.chainId),
    contractAddress: arcusXEscrowAddress,
    deployer: deployer.address,
    treasury,
    platformFeeBps,
    referralFeeBps,
    globalArbitrator,
    autoApproveWindow,
    allowedTokens,
    deploymentTime: new Date().toISOString()
  };

  console.log("\nDeployment info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return arcusXEscrowAddress;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
