# Why ArcusX?

ArcusX is a freelancing and work-settlement platform on **Stellar**: clients and workers collaborate with **conditional USDC escrow** — fund, deliver, approve, release.

## Advantages

### Competitive fees

Platform fee is **2% total**, deducted from the **worker** on release. Employers fund the posted amount with no surcharge. See [Fee model](/sdk/FEE_MODEL).

### Fast settlement

Stellar confirms in seconds. Once the client approves, payout is an on-chain release — not a multi-day bank batch.

### Secure escrow

Funds sit in a Stellar smart contract until rules are met. ArcusX does not custody user keys. Releases and disputes are ledger-visible.

### Global access

Anyone with internet and a Stellar wallet can participate — no local bank gatekeeping for USDC rails.

### Transparency

Deposits, releases, and contract state can be verified on Stellar explorers (testnet or mainnet).

### Disputes

Built-in dispute flow with admin resolution when parties disagree before release.

## vs traditional platforms

| Feature | Typical freelance platforms | ArcusX |
|---------|----------------------------|--------|
| Fees | Often 10–20%+ | 2% from worker; employer funds posted amount |
| Payout speed | Days | Seconds after approval |
| Fund custody | Platform / processor | On-chain escrow |
| Transparency | Limited | Blockchain ledger |
| Geography | Often restricted | Global USDC / Stellar |

## Who it is for

**Clients** — lock budget until delivery is accepted.  
**Workers** — get paid the agreed USDC amount when approved.  
**Builders** — integrate the same rail via [`@arcusx/sdk`](/sdk/) and `api.arcusx.pro`.

## Next

- [Quickstart](/getting-started/quickstart)  
- [How it works](/getting-started/how-arcusx-works)  
- [SDK](/sdk/QUICKSTART)  
