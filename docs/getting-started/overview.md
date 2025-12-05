# Overview

## What is ArcusX?

ArcusX is a **decentralized freelancing platform** built on the Stellar blockchain. It connects clients who need work done with freelancers who can complete tasks, using blockchain technology to ensure secure, transparent payments.

## How It Works

### For Clients (Task Creators)

1. **Create a Task**
   - Define the work needed
   - Set a price in XLM
   - Choose category and difficulty

2. **Review Proposals**
   - Receive applications from freelancers
   - Review portfolios and messages
   - Select the best candidate

3. **Fund Escrow**
   - Create a Stellar escrow account
   - Fund it with the task payment amount
   - Funds are locked until work is completed

4. **Approve & Pay**
   - Review completed work
   - Approve completion
   - Funds are automatically released to the worker

### For Workers (Freelancers)

1. **Browse Tasks**
   - View available tasks
   - Filter by category, difficulty, price

2. **Apply to Tasks**
   - Submit a proposal with your Stellar wallet address
   - Include a message and portfolio link
   - Wait for client selection

3. **Complete Work**
   - Communicate with client via in-app messaging
   - Submit completed work
   - Mark task as complete

4. **Receive Payment**
   - Once client approves, withdraw funds
   - Payment is sent directly to your Stellar wallet

## Key Concepts

### Escrow System

ArcusX uses **multi-signature (2-of-2) escrow accounts** on Stellar:

- Each task gets a dedicated Stellar account
- Requires signatures from both client and worker to release funds
- Funds are locked until both parties agree
- No third-party control over funds

### Stellar Blockchain

- **Network**: Currently on Stellar Testnet (migrating to Mainnet)
- **Currency**: XLM (Stellar Lumens)
- **Transactions**: All payments are on-chain, transparent, and immutable
- **Fees**: Minimal transaction fees (~0.0001 XLM)

### Wallets Supported

- **Freighter** (Primary)
- xBull
- Albedo
- Rabet
- Lobstr

## Benefits

### For Clients
- ✅ Secure payments (funds locked in escrow)
- ✅ No upfront payment until work is approved
- ✅ Transparent transaction history
- ✅ Direct blockchain payments

### For Workers
- ✅ Guaranteed payment (funds in escrow)
- ✅ Fast payments (Stellar's 3-5 second confirmation)
- ✅ Low fees
- ✅ No middleman taking cuts

## Platform Features

### Task Management
- Create tasks with detailed descriptions
- Set prices in XLM
- Categorize by type (Development, Design, Marketing, etc.)
- Set difficulty levels

### Proposal System
- Workers can apply to multiple tasks
- Clients can review all proposals
- Portfolio links and messages included

### Communication
- In-app messaging system
- Real-time chat between client and worker
- Message history per task

### Security
- JWT-based authentication
- OAuth integration (Google, GitHub)
- Stellar wallet verification
- Multi-signature escrow

## Current Status

- **Network**: Stellar Testnet
- **Status**: Active Development
- **Users**: ~55 registered users
- **Track**: Stellar Scale (Advanced / Infrastructure)

## Next Steps

- [Installation](installation.md) - Set up your development environment
- [User Guide](../user-guide/README.md) - Learn how to use the platform
- [Architecture](../architecture/README.md) - Understand the technical architecture

---

**Next**: [Installation →](installation.md)

