# Frequently Asked Questions (FAQ)

Common questions and answers about ArcusX platform, features, and usage. ❓

## General Questions

### What is ArcusX?

ArcusX is a decentralized freelancing platform built on the Stellar blockchain that connects clients with workers through secure escrow smart contracts. We offer competitive fees (2% from the worker on release; employers fund the posted amount), instant payments, and global access to freelance opportunities.

### How is ArcusX different from traditional freelancing platforms?

ArcusX differs in several key ways:
- Much lower commission than traditional platforms (2% from worker; employer funds the posted amount with no platform surcharge)
- Instant payments (3-5 seconds vs days/weeks)
- No geographical restrictions
- Complete transparency (all transactions on blockchain)
- Decentralized escrow (platform cannot access funds)
- Global accessibility

### Is ArcusX available in my country?

ArcusX is accessible globally to anyone with internet access. There are no geographical restrictions. You only need a Stellar wallet to receive payments.

### What blockchain does ArcusX use?

ArcusX uses the Stellar blockchain, which offers fast transactions (3-5 second confirmation), low fees, and high reliability. Escrow and payouts use ArcusX Escrow (USDC on Stellar).

### Is ArcusX safe?

Yes, ArcusX is built with security as a priority:
- Funds are held in smart contracts (platform cannot access them)
- All transactions are verified on blockchain
- JWT authentication for account security
- Input validation on all forms
- Dispute resolution system for conflicts
- Security audits before Mainnet launch

## Getting Started

### How do I create an account?

Visit the ArcusX website and click "Register". You can create an account using:
- Email and password
- Google account (OAuth)
- GitHub account (OAuth)

### Do I need a wallet?

Yes, you need a Stellar wallet to receive payments (workers) or make payments (clients). We recommend Freighter wallet, which is a browser extension. Other supported wallets include xBull, Albedo, Rabet, and Lobstr.

### How do I set up Freighter wallet?

1. Install the Freighter extension in your browser
2. Create a new wallet or import an existing one
3. Make sure you're on Stellar Testnet (for testing) or Mainnet (for production)
4. In ArcusX, go to your profile and register your Stellar address
5. Connect your wallet to the platform

### What is Stellar Testnet vs Mainnet?

- **Testnet**: Testing environment with fake tokens. Use this to learn the platform without financial risk.
- **Mainnet**: Production environment with real USDC. This is where real transactions happen.

ArcusX currently operates on Testnet and will migrate to Mainnet after security audits.

### How do I get USDC on Stellar?

You can obtain Stellar USDC through:
- Cryptocurrency exchanges that support Stellar USDC
- Stellar DEX (Decentralized Exchange)
- Other Stellar wallet users
- Stellar-based payment services

## For Workers

### How do I apply to tasks?

1. Browse available tasks in the Dashboard
2. Click on a task to view details
3. Click "Apply" button
4. Fill out the proposal form with your message and portfolio link
5. Confirm your Stellar wallet address
6. Submit your proposal

### When do I get paid?

You receive payment after:
1. You mark the task as completed
2. Client reviews and approves your work
3. Client releases funds from escrow
4. Payment is processed (3-5 seconds) to your wallet

### How much commission does ArcusX charge?

ArcusX charges a 2% total fee deducted from the worker on release. If the task is 100 USDC, the employer funds 100 USDC and the worker receives ~98 USDC.

### Can I cancel a task after accepting?

Workers can cancel under certain conditions:
- If client hasn't funded escrow after 48 hours
- If client requests changes outside original scope
- If client doesn't respond after 7 days

Cancellation rules protect both parties and are explained in task details.

### How do disputes work?

If you have a conflict with a client:
1. Either party can initiate a dispute
2. Provide a reason for the dispute
3. An administrator reviews the case
4. Admin decides fund distribution (client refund, worker payment, or split)
5. Funds are distributed according to decision

### Do I need to pay anything to join?

No, creating an account and applying to tasks is completely free. You only pay transaction fees on the Stellar network (minimal, typically less than $0.01).

## For Clients

### How do I create a task?

1. Go to Dashboard and click "Create Task"
2. Fill out task details (title, description, budget, category, difficulty)
3. Review the summary showing worker payment, commission, and total
4. Publish the task

### How does escrow work?

When you select a worker:
1. An escrow smart contract is created
2. You fund the escrow with the posted task amount (no platform surcharge)
3. Funds are held securely in the contract
4. When work is approved, funds are automatically released
5. Worker receives ~98%; platform receives the 2% fee

### Can I cancel a task?

Cancellation depends on task status:
- **Early cancellation**: If worker hasn't started, you can cancel with full refund
- **Work started**: Requires initiating a dispute for resolution
- **After completion**: Cannot cancel tasks already completed and paid

### What if I'm not satisfied with the work?

You can:
1. Request changes through messaging
2. Initiate a dispute if work doesn't meet requirements
3. Administrator reviews and decides fair resolution
4. Funds are distributed accordingly

### How much does it cost to post a task?

Posting tasks is free. You only pay:
- The agreed payment to the worker
- No platform fee for posting/funding — the 2% fee is taken from the worker on release
- Minimal Stellar transaction fees

### How long does payment take?

Payments are processed instantly (3-5 seconds) once you approve and release funds. This is much faster than traditional platforms that take days or weeks.

## Payments and Fees

### What currency does ArcusX use?

ArcusX uses USDC (USD Coin) on the Stellar blockchain. USDC is a stablecoin pegged to the US dollar (1 USDC = 1 USD).

### How much is the platform commission?

ArcusX charges a 2% total fee from the worker on escrow release. Employers are not charged a platform fee to post or fund. This is far below typical 10–20% freelancer take-rates.

### Are there any hidden fees?

No, there are no hidden fees. The only costs are:
- Platform commission (2% from worker, clearly shown)
- Stellar network transaction fees (minimal, less than $0.01)

### How are payments processed?

Payments are processed automatically through Stellar smart contracts:
1. Client approves work
2. Client releases funds
3. Smart contract distributes funds (worker ~98% + platform ~2%)
4. Transaction confirms in 3-5 seconds
5. Funds appear in wallets

### Can I use other cryptocurrencies?

Currently, ArcusX only supports USDC on Stellar. We plan to add support for other Stellar assets in the future.

## Technical Questions

### What wallets are supported?

We support multiple Stellar wallets:
- Freighter (recommended, browser extension)
- xBull
- Albedo
- Rabet
- Lobstr

### Is my wallet safe?

Wallet security is your responsibility. Always:
- Keep your private keys secure and backed up
- Never share your private keys
- Use official wallet software
- Verify transaction details before signing
- Use hardware wallets for large amounts (when supported)

### What if I lose my wallet?

If you lose access to your wallet and don't have your backup, you cannot recover it. Always back up your wallet seed phrase in a secure location.

### How does the escrow smart contract work?

Escrow contracts are deployed on Stellar via ArcusX Escrow:
- Funds are locked in the contract
- Contract executes when approval / dispute rules are met
- Platform cannot move funds outside those rules
- Operations are transparent and verifiable on the ledger

### Can the platform freeze or seize my funds?

No, the platform cannot freeze or seize funds in escrow. Funds are held in smart contracts that only execute based on predefined rules. The platform cannot access these funds.

## Security and Support

### What if I find a security issue?

Report security issues responsibly through official channels. Do not disclose vulnerabilities publicly until they are resolved.

### How do I get support?

- Check this FAQ for common questions
- Review documentation for detailed guides
- Contact support through official channels
- Join community discussions

### Is my personal information safe?

We follow best practices for data security:
- Encrypted data transmission
- Secure authentication (JWT tokens)
- Limited data collection (only necessary information)
- No sharing of personal data with third parties
- See Privacy Policy for details

### What happens if the platform shuts down?

Funds in escrow are held in smart contracts on Stellar blockchain, not on our servers. Even if the platform shuts down, funds remain accessible through the smart contracts. However, you would need technical knowledge to interact with contracts directly.

## Future Features

### When will ArcusX launch on Mainnet?

Mainnet launch is planned after completing security audits and comprehensive testing. We will announce the date through official channels.

### Will there be a mobile app?

Yes, mobile applications for iOS and Android are planned for 2025-2026.

### Will you support other blockchains?

Currently, we're focused on Stellar. We may consider other blockchains in the future based on community needs and technical feasibility.

### Will there be a native token?

We're designing a tokenomics model. Details will be announced when ready.

Have more questions? Contact us through our official channels or join community discussions.

