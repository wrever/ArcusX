# Stellar Network Integration

ArcusX is built on the Stellar blockchain, leveraging its fast, low-cost transaction capabilities for decentralized freelancing payments.

## Why Stellar?

Stellar was chosen for ArcusX because of its unique advantages:

- **Fast Transactions**: 3-5 second confirmation times
- **Low Fees**: Minimal transaction costs (typically <$0.01)
- **Stable Infrastructure**: 8+ years of proven operation
- **USDC Support**: Native support for Stellar USDC
- **Global Access**: No geographical restrictions
- **Smart Contracts**: Soroban smart contract support via Trustless Work

## Network Configuration

### Testnet vs Mainnet

ArcusX currently operates on **Stellar Testnet** for development and testing. Mainnet migration will occur after security audits.

**Testnet**
- Horizon: `https://horizon-testnet.stellar.org`
- Network Passphrase: `Test SDF Network ; September 2015`
- Use for: Development, testing, learning
- Funds: Test tokens (not real value)

**Mainnet**
- Horizon: `https://horizon.stellar.org`
- Network Passphrase: `Public Global Stellar Network ; September 2015`
- Use for: Production, real transactions
- Funds: Real USDC

### Configuration

Configure network in `src/config/trustlessWork.ts`:

```typescript
export const TRUSTLESS_WORK_BASE_URL = import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL === 'mainnet' 
  ? mainNet 
  : development;
```

## Wallet Integration

### Supported Wallets

ArcusX supports multiple Stellar wallets:

- **Freighter** (Recommended): Browser extension wallet
- **xBull**: Browser extension
- **Albedo**: Web-based wallet
- **Rabet**: Browser extension
- **Lobstr**: Mobile and web wallet

### Wallet Connection

Use `@creit.tech/stellar-wallets-kit` for wallet integration:

```typescript
import { useWallet } from '../hooks/useWallet';

const { connectFreighter, address, isConnected } = useWallet();
```

### Wallet Address Format

Stellar addresses:
- Start with 'G'
- 56 characters long
- Base32 encoded public key
- Example: `GBXBJSGUDCUXED5FTRO63XIVYYWY4QVEIK6R2UGZ4SFGCJGUJA6HWE5H`

## USDC on Stellar

### Stellar USDC

ArcusX uses Stellar USDC (USD Coin):
- Issuer: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- 1:1 peg with USD
- 7 decimal precision
- Fast and low-cost transfers

### Trustlines

To receive USDC, wallets must establish a trustline:

1. Wallet must trust the USDC issuer
2. Trustline allows receiving USDC
3. Freighter handles trustline creation automatically
4. Small XLM reserve required for trustlines

### Getting USDC

**Testnet:**
- Use Stellar Testnet faucets
- Request testnet USDC through DEX
- Use Friendbot for XLM, then swap

**Mainnet:**
- Purchase through exchanges (Coinbase, Kraken, etc.)
- Use Stellar DEX
- Receive from other Stellar users

## Transactions

### Transaction Flow

1. **Create Transaction**: Build transaction with operations
2. **Sign Transaction**: User signs with wallet
3. **Submit Transaction**: Send to Horizon API
4. **Confirmation**: Wait for ledger inclusion (3-5 seconds)

### Transaction Fees

- Minimum fee: 100 stroops (0.00001 XLM)
- Typical fee: <$0.01 USD equivalent
- Fees paid in XLM
- Account must maintain minimum XLM balance

### Transaction Signing

ArcusX uses wallet signing (not server-side):

```typescript
// User signs in their wallet
const signedTx = await kit.signTransaction(xdr);
```

## Smart Contracts

### Trustless Work Integration

ArcusX uses Trustless Work for escrow smart contracts:

- Smart contracts deployed on Stellar via Soroban
- Contract IDs start with 'C'
- Automatic execution based on contract terms
- No manual intervention required

### Contract Interaction

Contracts interact through Trustless Work API:

- Create escrow contracts
- Fund escrows
- Approve milestones
- Release funds
- Resolve disputes

## Horizon API

### Querying Blockchain Data

Use Horizon API to query blockchain data:

```typescript
import Server from '@stellar/stellar-sdk';

const server = new Server('https://horizon-testnet.stellar.org');

// Get account details
const account = await server.loadAccount(address);

// Get transactions
const transactions = await server.transactions()
  .forAccount(address)
  .call();
```

### Common Queries

**Account Information**
```typescript
const account = await server.loadAccount(walletAddress);
console.log(account.balances); // Account balances
```

**Transaction History**
```typescript
const transactions = await server.transactions()
  .forAccount(walletAddress)
  .order('desc')
  .limit(10)
  .call();
```

**Payment Operations**
```typescript
const payments = await server.payments()
  .forAccount(walletAddress)
  .call();
```

## Security Considerations

### Private Keys

- **Never share private keys**
- Private keys are stored in user wallets
- ArcusX never has access to private keys
- Users are responsible for key security

### Transaction Security

- Always verify transaction details before signing
- Check recipient addresses carefully
- Verify amounts and fees
- Review transaction memos

### Account Security

- Use hardware wallets for large amounts
- Enable multi-signature when available
- Regular backup of wallet seed phrases
- Secure storage of recovery phrases

## Network Status

### Monitoring

Monitor Stellar network status:
- Stellar Dashboard: https://dashboard.stellar.org/
- Horizon status endpoints
- Network performance metrics

### Network Reliability

Stellar network characteristics:
- 99.99% uptime
- Global distributed network
- No single point of failure
- Fast consensus (3-5 seconds)

## Development Tools

### Stellar Laboratory

Test and explore Stellar features:
- https://laboratory.stellar.org/
- Transaction builder
- Account viewer
- XDR viewer

### Friendbot (Testnet)

Get testnet XLM:
- https://friendbot.stellar.org/
- Enter testnet address
- Receive 10,000 XLM for testing

### Stellar Explorer

Explore blockchain:
- Testnet: https://stellar.expert/explorer/testnet
- Mainnet: https://stellar.expert/explorer/public

## Best Practices

### For Developers

- Always test on Testnet first
- Handle network errors gracefully
- Implement transaction retry logic
- Monitor transaction status
- Cache account data appropriately

### For Users

- Verify network (Testnet vs Mainnet)
- Double-check addresses before sending
- Keep XLM reserves for fees
- Understand transaction irreversibility
- Secure wallet backups

## Resources

- **Stellar Documentation**: https://developers.stellar.org/
- **Horizon API Reference**: https://developers.stellar.org/api
- **Stellar SDK**: https://github.com/stellar/js-stellar-sdk
- **Trustless Work Docs**: https://docs.trustlesswork.com/
- **Stellar Explorer**: https://stellar.expert/

## Next Steps

- Learn about [Escrow Contracts](../getting-started/smart-escrow-contracts.md)
- Review [Developer Guide](../developer-guide/introduction.md)
- Explore [Transaction Handling](transactions.md)
- Study [Wallet Integration](wallets.md)

Understanding Stellar is key to working with ArcusX effectively.

