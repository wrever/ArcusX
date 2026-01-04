# Smart Escrow Contracts in ArcusX

ArcusX leverages Trustless Work smart contracts on the Stellar blockchain to create secure, transparent, and automated escrow agreements between clients and workers. 🔐

## What Are Smart Escrow Contracts?

Smart escrow contracts are self-executing programs deployed on the blockchain that automatically manage funds according to predefined rules. In ArcusX, these contracts hold payments in escrow until work is completed and approved, then automatically release funds to the appropriate parties.

## Key Features

### Automation

Once deployed, smart contracts execute automatically without requiring manual intervention. This eliminates the need for intermediaries and reduces the risk of human error or manipulation.

### Trustlessness

Neither party needs to trust each other or the platform. The contract code is transparent and verifiable, and execution is guaranteed by the blockchain consensus mechanism.

### Immutability

Once deployed, contract terms cannot be modified. This ensures that agreements made at the start of a task remain unchanged throughout the process.

### Transparency

All contract interactions are recorded on the Stellar blockchain and can be verified by anyone. This creates complete transparency in the escrow process.

## How ArcusX Escrow Contracts Work

### Contract Creation

When a client selects a worker proposal:

1. The system calculates the escrow amount (worker payment + platform commission)
2. A Trustless Work single-release escrow contract is created
3. Contract parameters are defined:
   - Approver: Client wallet address
   - Service Provider: Worker wallet address
   - Platform Address: ArcusX treasury wallet
   - Dispute Resolver: Admin wallet address
   - Receiver: Worker wallet address
   - Milestone: Task description and payment amount
   - Trustline: USDC issuer address on Stellar
4. Client signs the contract creation transaction
5. Contract ID is stored in the database for tracking

### Contract Funding

After creation, the client funds the escrow:

1. System retrieves the exact milestone amount from the contract
2. Client initiates funding transaction
3. USDC is transferred from client wallet to escrow contract
4. Contract balance is updated on-chain
5. Task status changes to "in_progress"

### Work Completion

During the work phase:

1. Worker completes the task according to specifications
2. Worker marks task as completed in the platform
3. Client receives notification to review work
4. Client can approve, request changes, or initiate dispute

### Milestone Approval

When client approves the work:

1. Client signs milestone approval transaction
2. Smart contract records approval status
3. Funds become eligible for release
4. System enables fund release functionality

### Fund Release

Upon approval, funds are released:

1. Client triggers fund release (or system auto-releases if milestone approved)
2. Smart contract executes fund distribution:
   - Worker receives agreed payment amount
   - Platform receives 0.5% commission
   - Contract balance becomes zero
3. Transaction confirms in 3-5 seconds
4. Task status updates to "completed"

## Contract Structure

### Single-Release Escrow

ArcusX uses single-release escrow contracts, meaning each task has one milestone that releases all funds at once. This simplifies the process while maintaining security.

### Roles in the Contract

- **Approver**: The client who approves work completion
- **Service Provider**: The worker who performs the work
- **Platform Address**: Receives commission automatically
- **Dispute Resolver**: Administrator who can resolve disputes
- **Receiver**: Final recipient of payment (worker)

### Milestone Configuration

Each contract includes a milestone with:
- Description: Task description
- Amount: Payment amount in USDC (must match escrow amount for single-release)

## Dispute Handling

If a dispute arises:

1. Either party initiates dispute through the platform
2. Dispute is recorded on-chain in the smart contract
3. Contract enters "disputed" state
4. All release functions are disabled
5. Administrator reviews dispute details
6. Administrator decides resolution (client refund, worker payment, or split)
7. Resolution is executed through smart contract
8. Funds are distributed according to decision

The dispute resolver role is critical - only the designated admin wallet can resolve disputes and distribute funds accordingly.

## Security Guarantees

### Fund Protection

- Funds cannot be withdrawn by platform
- Only approved recipients can receive funds
- Contract code cannot be modified after deployment
- All operations require appropriate signatures

### Transaction Security

- All transactions are signed by required parties
- Stellar network validates all transactions
- Contract state is verified on-chain
- No single point of failure

### Transparency

- Contract code is open and verifiable
- All transactions are public on blockchain
- Contract state can be queried by anyone
- Complete audit trail for all operations

## Commission Handling

The platform commission is handled automatically:

1. Commission is included in escrow amount calculation
2. When funds are released, commission is automatically sent to platform treasury
3. Worker receives exact agreed amount
4. No manual intervention required

Commission formula: Escrow Amount = Worker Amount / (1 - 0.005)

## Technical Implementation

### Trustless Work Integration

ArcusX integrates with Trustless Work API for contract management:

- Contract creation through InitializeSingleReleaseEscrow
- Contract funding through FundEscrow
- Milestone approval through ApproveMilestone
- Fund release through ReleaseFunds
- Dispute initiation through StartDispute
- Dispute resolution through ResolveDispute

### Stellar Network

Contracts operate on Stellar blockchain:

- Fast confirmation times (3-5 seconds)
- Low transaction fees
- High reliability and uptime
- Global accessibility

### USDC Integration

All escrow contracts use Stellar USDC:

- Stable value (1 USDC = 1 USD)
- Fast transfers
- Wide acceptance
- Standard token on Stellar

## Advantages Over Traditional Escrow

| Feature | Traditional Escrow | ArcusX Smart Contracts |
|---------|-------------------|------------------------|
| Execution | Manual | Automatic |
| Transparency | Limited | Complete (blockchain) |
| Speed | Days/Weeks | Seconds |
| Cost | High fees | Minimal (0.5%) |
| Trust Required | High | None (trustless) |
| Global Access | Limited | Universal |
| Reversibility | Possible | Immutable |

## Contract Verification

Users can verify contract details:

1. Contract ID is displayed in task details
2. Contract state can be queried on Stellar explorer
3. All transactions are visible on blockchain
4. Contract code is open source and auditable

## Best Practices

### For Clients

- Review contract details before signing
- Ensure sufficient USDC balance before funding
- Approve work only when satisfied
- Use dispute system if issues arise

### For Workers

- Verify contract funding before starting work
- Complete work according to specifications
- Communicate clearly with clients
- Understand dispute resolution process

### For Everyone

- Keep wallet secure and backed up
- Verify transaction details before signing
- Understand smart contract cannot be modified
- Use official ArcusX platform for interactions

Smart escrow contracts are the foundation of ArcusX's security and efficiency. They ensure that all parties are protected while enabling fast, transparent, and cost-effective transactions.

