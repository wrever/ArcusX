# How ArcusX Works

ArcusX operates as a decentralized freelancing platform that leverages Stellar blockchain technology and Trustless Work smart contracts to facilitate secure, transparent, and efficient transactions between clients and workers.

## Architecture Overview

ArcusX consists of three main layers:

1. **Frontend**: React-based web application for user interaction
2. **Backend**: PHP REST API for business logic and data management
3. **Blockchain**: Stellar network with Trustless Work smart contracts for escrow

## Core Components

### Authentication System

ArcusX supports multiple authentication methods:

- **Email/Password**: Traditional registration with JWT token-based authentication
- **OAuth Integration**: Sign in with Google or GitHub through Supabase
- **Wallet Connection**: Stellar wallet integration for transaction signing

All authentication tokens are stored securely and validated on each API request.

### Task Management

Tasks are the fundamental unit of work on ArcusX. Each task includes:

- Title, description, and requirements
- Budget in USDC (Stellar USDC)
- Category (Development, Design, Marketing, Blockchain, Content)
- Difficulty level (Easy, Intermediate, Difficult)
- Status tracking (open, in_progress, completed, disputed, cancelled)

### Proposal System

Workers apply to tasks by submitting proposals that include:

- Message explaining their suitability
- Portfolio link (optional)
- Stellar wallet address for payment receipt
- Status tracking (pending, accepted, rejected)

### Escrow System

The escrow system is built on Trustless Work smart contracts:

1. **Creation**: Client creates an escrow contract after selecting a proposal
2. **Funding**: Client funds the escrow with the total amount (worker payment + commission)
3. **Work Phase**: Worker completes the task while funds are secured
4. **Approval**: Client reviews and approves completed work
5. **Release**: Funds are automatically released to the worker (minus 0.5% commission)

## Transaction Flow

### Complete Task Lifecycle

```
1. Client Creates Task
   ↓
2. Workers Submit Proposals
   ↓
3. Client Selects Proposal
   ↓
4. Escrow Contract Created (Smart Contract)
   ↓
5. Client Funds Escrow (USDC on Stellar)
   ↓
6. Worker Begins Work
   ↓
7. Worker Marks Task as Completed
   ↓
8. Client Reviews and Approves
   ↓
9. Funds Released to Worker (3-5 seconds)
   ↓
10. Task Completed and Archived
```

### Escrow Contract Details

Each escrow contract specifies:

- **Approver**: Client (who approves milestones)
- **Service Provider**: Worker (who receives funds)
- **Platform Address**: ArcusX platform wallet (receives commission)
- **Dispute Resolver**: Admin wallet (for dispute resolution)
- **Receiver**: Worker (final recipient of funds)
- **Milestones**: Task description and amount
- **Trustline**: USDC issuer address on Stellar

## Smart Contract Integration

ArcusX uses Trustless Work for escrow management:

- **Single-Release Escrow**: One milestone per task
- **Automated Execution**: Smart contracts execute exactly as programmed
- **No Central Control**: Platform cannot modify or interfere with contracts
- **Transparent**: All contract interactions are on-chain and verifiable

## Commission Model

The platform charges 0.5% commission on each transaction:

- Commission is calculated and included in the escrow amount
- Formula: Escrow Amount = Worker Amount / (1 - 0.005)
- Commission is automatically sent to the platform treasury address
- Workers receive the exact amount specified in the task

Example:
- Task budget: 100 USDC
- Escrow amount: 100.5025 USDC (100 / 0.995)
- Platform commission: 0.5025 USDC
- Worker receives: 100 USDC

## Dispute Resolution

When conflicts arise:

1. **Initiation**: Either party can start a dispute with a reason
2. **Blockchain State**: Dispute status is recorded on-chain
3. **Review**: Administrator reviews dispute details (chat, files, timeline)
4. **Resolution**: Admin decides fund distribution (client, worker, or split)
5. **Execution**: Decision is executed through smart contract
6. **Finalization**: Funds are distributed according to decision

The dispute system protects both parties and ensures fair resolution.

## Cancellation and Refunds

Cancellation rules:

- **Early Cancellation**: If worker hasn't started, client can cancel with full refund
- **Work Started**: Cancellation requires dispute initiation
- **After Completion**: Cannot cancel tasks already completed and paid
- **Worker Cancellation**: Worker can cancel if client fails to fund escrow after 48 hours

Refunds are processed through the smart contract, ensuring secure fund return.

## Security Features

### Blockchain Security

- **Stellar Network**: Proven blockchain with 8+ years of operation
- **Smart Contracts**: Trustless Work contracts ensure automated execution
- **Immutable Records**: All transactions are permanent and verifiable
- **No Single Point of Failure**: Decentralized architecture

### Platform Security

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All inputs validated on frontend and backend
- **SQL Injection Prevention**: Prepared statements in all database queries
- **XSS Protection**: Output sanitization and content security policies
- **Rate Limiting**: API rate limits to prevent abuse

### Fund Security

- **Escrow Protection**: Funds cannot be accessed by platform
- **Multi-Signature Support**: Smart contract requires proper authorization
- **Dispute Protection**: Both parties protected through dispute system
- **Automatic Execution**: No manual intervention in fund transfers

## Performance Optimizations

ArcusX implements several optimizations:

- **Caching System**: Reduces API calls by 70% through intelligent caching
- **Debouncing**: Prevents excessive requests during user interactions
- **Optimized Polling**: Reduced polling intervals from 2s to 5-8s
- **Error Handling**: Graceful handling of rate limits and network errors
- **Lazy Loading**: Components and data loaded on demand

## Technology Stack

### Frontend

- **Framework**: React 19.0.0 with TypeScript 5.7.2
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 6.30.0
- **UI Libraries**: Chakra UI 3.15.0, Framer Motion 12.6.3
- **Wallet Integration**: @creit.tech/stellar-wallets-kit 1.9.5
- **Blockchain SDK**: @stellar/stellar-sdk 11.2.2
- **Escrow Library**: @trustless-work/escrow 3.0.2

### Backend

- **Language**: PHP
- **Database**: MySQL/MariaDB
- **Authentication**: JWT (Firebase JWT 6.0)
- **OAuth**: Supabase (Google, GitHub)

### Blockchain

- **Network**: Stellar Testnet (migrating to Mainnet)
- **Wallet**: Freighter (primary), xBull, Albedo, Rabet, Lobstr
- **Currency**: USDC on Stellar
- **Escrow**: Trustless Work smart contracts

## Network Status

ArcusX currently operates on Stellar Testnet for development and testing. The platform will migrate to Stellar Mainnet after completing security audits and comprehensive testing.

Testnet allows users to:
- Test all platform features with test tokens
- Learn the platform without financial risk
- Provide feedback before Mainnet launch

## Integration Points

### External Services

- **Supabase**: Authentication and user management
- **Trustless Work API**: Escrow contract creation and management
- **Stellar Horizon**: Blockchain data queries and transaction submission
- **Freighter Wallet**: User wallet connection and transaction signing

### Internal Services

- **REST API**: All platform operations through PHP endpoints
- **Real-time Messaging**: Direct communication between users
- **Notification System**: In-app notifications for important events
- **Admin Panel**: Platform administration and dispute resolution

This architecture ensures reliability, security, and scalability while maintaining the decentralized principles that make ArcusX unique.

