<div align="center">

<img src="./arcusx/src/images/arcus-logo.png" alt="ArcusX Logo" width="200"/>

**The Future of Freelancing on Blockchain**

Empowering freelancers with fast, secure, and borderless crypto payments on Stellar from Chile.

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)](https://www.stellar.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Current line:** [`ArcusX3.8`](https://github.com/wrever/ArcusX/tree/ArcusX3.8) · marketplace [arcusx.pro](https://arcusx.pro) · partner API [api.arcusx.pro](https://api.arcusx.pro) · docs [docs.arcusx.pro](https://docs.arcusx.pro)

</div>

---

## 📋 Table of Contents

- [Changelog](#changelog)
- [Releases (guía)](./docs/RELEASING.md)
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Changelog

Los cambios notables están en **[CHANGELOG.md](./CHANGELOG.md)**.

- **Publicar una versión:** [Guía de releases](./docs/RELEASING.md).
- **Historial etiquetado:** [Releases en GitHub](https://github.com/wrever/ArcusX/releases) (crear el release asociado al tag `v*`).

## 🎯 Overview

ArcusX is a Stellar Testnet marketplace and **payout infrastructure**: clients and freelancers settle in **USDC** through non-custodial escrow, plus a **partner SDK** (`@arcusx/sdk`) so third-party apps and agents can create jobs without the marketplace UI.

### Rails

| Rail | Who | Auth |
|------|-----|------|
| Marketplace | Humans on [arcusx.pro](https://arcusx.pro) | OAuth + app JWT |
| Partner | Integrators | API key `axk_test_…` / `axk_live_…` |
| Agentic (SOW 3) | Agent runtimes via `client.agent.*` | Same partner API key (`partner_id`) |

**SOW 3 Week 1 (this line):** authenticated `POST/GET /v1/jobs` — create, status, idempotent retry. Fund / release on-chain is **Week 2+**. Packet: [`docs/sprints/instaawards-sow3/`](./docs/sprints/instaawards-sow3/).

### Key Benefits

- **2% platform fee** deducted from the **worker** on escrow release (employer funds the posted amount)
- **Instant settlement** on Stellar (~5s)
- **Non-custodial escrow** — client signs; worker receives ~98% USDC
- **Partner + agent APIs** without forcing ArcusX login
- **Transparent** on-chain verification
- **Dispute** flow with chat and evidence

## ✨ Features

### For Clients
- Create tasks with USDC budgets (Testnet)
- Review freelancer proposals
- Escrow protects funds until work is approved
- Client signs deploy / fund / release

### For Freelancers
- Browse and apply globally
- Payment guarantee through escrow
- Low platform fee vs traditional marketplaces
- Direct USDC to Freighter (or partner-provided wallet)

### Platform / developers
- `@arcusx/sdk` — public, marketplace, partner escrow/deals, **agent jobs**
- Gateway `https://api.arcusx.pro`
- Agentic harness: `local-test/` → `npm run dev` (http://localhost:5200)
- Smoke: `cd packages/arcusx-sdk && npm run smoke:sow3:week1`

## 🛠 Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM 6
- **Auth**: Supabase OAuth (Google / GitHub) → app JWT
- **Wallet**: Freighter / `WalletAdapter`

### Backend
- **API**: Supabase Edge Functions (`arcusx-api`, `arcusx-admin`) — **no PHP on the production path**
- **Database**: Postgres (Supabase)
- **Partner keys**: `axk_test_` / `axk_live_`

### Blockchain
- **Network**: Stellar **Testnet** (mainnet is documented as future work)
- **Asset**: USDC on Stellar
- **Escrow**: ArcusX prepare → sign XDR → confirm (single-release)

## 🏗 Architecture

```
ArcusX/
├── arcusx/                 # Marketplace SPA (Vite)
├── packages/arcusx-sdk/    # @arcusx/sdk
├── supabase/functions/     # Edge API (arcusx-api)
├── local-test/             # Partner + agentic visual harness (:5200)
├── examples/               # Node / playground samples
└── docs/                   # SOW packets, SDK, escrow-native
```

Production API: `https://api.arcusx.pro` → Edge `arcusx-api`.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Freighter (for on-chain signing)
- Stellar Testnet account + USDC trustline (for escrow demos)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the marketplace app
- Partner sandbox key `ARCUSX_API_KEY=axk_test_…` for SDK / local-test

### Marketplace

```bash
cd arcusx
npm install
npm run dev
# → http://localhost:5173
```

### SDK + Week 1 agentic smoke

```bash
cd packages/arcusx-sdk && npm run build
npm run smoke:sow3:week1
npm run demo:sow3:week1
```

### Visual agentic test app

```bash
cd local-test && npm install && npm run dev
# → http://localhost:5200
```

See [`local-test/README.md`](./local-test/README.md) and [`CLAUDE.md`](./CLAUDE.md) for env vars.

### Docs for reviewers / Instawards

- SOW 3 Week 1: [`docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK1.md`](./docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK1.md)
- SOW 2 SDK: [`docs/sdk/`](./docs/sdk/)
- Memory: [`docs/archive/planning/MEMORIA_VITAL_ARCUSX.md`](./docs/archive/planning/MEMORIA_VITAL_ARCUSX.md)
- Releasing: [`docs/RELEASING.md`](./docs/RELEASING.md)

## ⚙️ Configuration

Marketplace: `arcusx/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, Stellar/Testnet wallets).  
SDK / harness: `ARCUSX_API_KEY=axk_test_…` (never commit). Details in [`CLAUDE.md`](./CLAUDE.md).

Testnet only on this line. Mainnet is a documented future switch (`useWallet.ts` + env), not part of v3.8.0.

## 📖 Usage (marketplace)

1. Sign in with Google/GitHub on [arcusx.pro](https://arcusx.pro)
2. Create or apply to a USDC task
3. Client funds escrow (Freighter, Testnet)
4. Worker delivers; client approves and **releases** (≈2% fee from worker)

Agent / partner (no marketplace UI):

```ts
const ax = new ArcusXClient({ apiKey: 'axk_test_…', network: 'testnet' });
const { job_id } = await ax.agent.create({ title: '…', external_ref: '…' });
await ax.agent.get(job_id);
```

## 📁 Project Structure

- `arcusx/` — marketplace SPA
- `packages/arcusx-sdk/` — public TypeScript SDK
- `supabase/functions/arcusx-api/` — production API (`?action=` + REST `/v1`)
- `local-test/` — visual partner/agentic harness
- `docs/sprints/instaawards-sow3/` — SOW 3 Week 1 packet + evidence

API surface: [`docs/sdk/`](./docs/sdk/) and OpenAPI `docs/sdk/openapi-v1.yaml`.

## 🔒 Security

- Non-custodial escrow (platform never holds user keys)
- Partner keys hashed server-side; never commit `.env`
- JWT marketplace auth separate from partner API keys
- Typed error envelopes (`missing_api_key`, `invalid_api_key`, …)

## 📊 Current Status

### Done
- Marketplace Testnet (tasks, escrow, disputes, ratings)
- `@arcusx/sdk` SOW 2 (partner escrow + deals)
- **SOW 3 Week 1** — agentic create/status on `api.arcusx.pro` (Edge `arcusx-api` v128)
- Platform fee **2% worker-side**

### Next (SOW 3 Week 2+)
- Fund prepare/confirm + release prepare/confirm on the agentic path
- Node agent demo E2E with Testnet tx evidence
- Mainnet remains **documented future work**, not this release

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test thoroughly before submitting PR
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: https://arcusx.pro/
- **Documentation**: https://docs.arcusx.pro/
- **Partner API**: https://api.arcusx.pro
- **Stellar Documentation**: https://developers.stellar.org/
- **Freighter Wallet**: https://www.freighter.app/

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

<div align="center">

**Built with ❤️ on Stellar from Chile**

*Decentralizing the Future of Freelancing*

</div>
