# Setup and installation

How to work against the **ArcusX public API** and `@arcusx/sdk`. For contributing to the open monorepo, clone [github.com/wrever/ArcusX](https://github.com/wrever/ArcusX).

## Prerequisites

- Node.js **≥ 18**
- A Stellar wallet for signing (Freighter, xBull, or Pollar embedded)
- Sandbox API key `axk_test_…` (Dashboard → Developer / API keys)

## Integrator project (recommended)

```bash
mkdir my-arcusx-app && cd my-arcusx-app
npm init -y
npm install @arcusx/sdk
```

### Environment

```bash
# Required
ARCUSX_API_KEY=axk_test_…

# Optional — default https://api.arcusx.pro
# ARCUSX_API_URL=https://api.arcusx.pro

# User-scoped actions (marketplace create, etc.)
# ARCUSX_USER_JWT=…
```

Partners using `https://api.arcusx.pro` do **not** need Supabase anon keys.

### First call

```ts
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  network: 'testnet',
});

const fee = await ax.public.getPlatformFee();
console.log(fee);
```

See [SDK Quickstart](/sdk/QUICKSTART).

## Escrow / wallets

On-chain steps (deploy, fund, release) return **unsigned XDR**. Your app signs with the user’s wallet and confirms via the SDK (`escrow.confirm*` / settlement helpers).

ArcusX Escrow is part of the platform API — you do not install a separate escrow vendor SDK.

## Monorepo (optional)

```bash
git clone https://github.com/wrever/ArcusX.git
cd ArcusX/arcusx
npm install
cp .env.example .env   # fill VITE_SUPABASE_* , wallets, network
npm run dev
```

Docs site:

```bash
cd docs
npm install
npm run dev
```

## Networks

| Network | Use |
|---------|-----|
| `testnet` | Sandbox / Instawards / development |
| `mainnet` | Production USDC (after checklist) |

Set `network: 'testnet' | 'mainnet'` on the SDK client (`x-arcusx-network`).

## Troubleshooting

| Issue | Check |
|-------|--------|
| `401 missing_api_key` | Send `Authorization: Bearer axk_test_…` to the gateway |
| `401 invalid_api_key` | Key revoked / wrong network prefix (`axk_test_` vs `axk_live_`) |
| Sign failures | Wallet network matches ArcusX network; address is `G…` |
| Escrow prepare 502 | Task must be deployed first; amounts and wallets valid |

## Next

- [Partner auth](/sdk/PARTNER_AUTH)  
- [API reference](/sdk/API_REFERENCE)  
- [Smart escrow](/getting-started/smart-escrow-contracts)  
