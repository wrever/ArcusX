# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

ArcusX is a decentralized freelancing platform on the Stellar blockchain. The repo contains three independent sub-projects:

- **`arcusx/`** — Main React 19 + TypeScript + Vite frontend (freelancing marketplace)
- **`supabase/functions/`** — Backend marketplace: Edge Functions (`arcusx-api`, `arcusx-admin`, referidos, etc.) + Postgres
- **`CertiX/`** — Next.js 14 app for blockchain-based verifiable certifications (separate product)
- **`Miraes/`** — Separate project (minimal, standalone)
- **`docs/escrow-native/`** — Escrow nativo Soroban (Edge Supabase + WASM en `contracts/arcusx-escrow/`). **Todo el sistema escrow nuevo vive solo en esta carpeta.**

There are **no automated tests** in any sub-project. `npm run lint` is the only automated code-quality check.

## Commands

### arcusx (main frontend)
```bash
cd arcusx
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run build:pwa    # Same but with PWA/service worker (ENABLE_PWA=true)
npm run lint         # ESLint
npm run preview      # Preview production build locally
npm run deploy:stellar  # Deploy Stellar escrow contract (tsx scripts/)
```

### Supabase Edge (API marketplace)
```bash
node scripts/bundle-edge-fn.mjs arcusx-api
SUPABASE_ACCESS_TOKEN=... node scripts/deploy-edge-from-bundle.mjs arcusx-api
```

### Escrow nativo (Soroban)
```bash
cd docs/escrow-native/contracts/arcusx-escrow
cargo test           # Tests del contrato WASM
```

### CertiX
```bash
cd CertiX
npm install
npm run dev          # Next.js dev server
npm run build        # Production build
npm run clean        # Wipe all blockchain data (runs scripts/clean-all-data.ts)
```

## Environment Setup

### `arcusx/.env`
```
VITE_TRUSTLESS_WORK_API_KEY=<from Trustless Work dashboard>
VITE_TRUSTLESS_WORK_BASE_URL=development   # or 'mainnet'
VITE_PLATFORM_WALLET=<Stellar G... address>
VITE_ADMIN_WALLET=<Stellar G... address>
VITE_STELLAR_NETWORK=testnet               # or 'mainnet'
VITE_SUPABASE_URL=<supabase project URL>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```

## Architecture

### Frontend (`arcusx/src/`)

**Routing** (`App.tsx`): React Router v6 with lazy-loaded routes. The app detects if it's running on the enterprise subdomain via `isEnterpriseLandingHost()` (`config/enterpriseSite.ts`) and renders a completely different landing (`EmpresasPage`) with its own navbar (`EmpresasNavbar.tsx`). Enterprise mode also forces light theme regardless of user preference (see `ThemeContext.tsx`).

**Authentication** — OAuth-only for end users:
- Supabase OAuth (Google/GitHub) via `config/supabase.ts`. After redirect, `authService.handleSupabaseCallback` calls `sync_supabase_user.php`, which issues the app JWT and user record. Token and user live in `localStorage`. There is no email/password sign-up or login in the app; those PHP endpoints were removed.
- Admin panel still uses `admin_login.php` (separate flow).
- `useAuth` hook polls `localStorage` every 500ms to detect same-tab auth changes.

**Wallet** (`hooks/useWallet.ts`): Freighter-only via `@creit.tech/stellar-wallets-kit`. Currently hardcoded to `WalletNetwork.TESTNET` — change here and in `networkPassphrase` to go to production. Wallet address is stored in `localStorage` after connect.

**Escrow flow** (`services/trustlessWorkEscrowService.ts`):
1. Client selects proposal → `ProposalReview.tsx` creates escrow via Trustless Work API
2. Client funds escrow → `EscrowProcessPopup.tsx` handles the multi-step UI
3. Freelancer marks milestone complete → `SuperviseTask.tsx`
4. Client approves and releases funds → **1% platform fee** auto-deducted

Critical escrow rules (documented in the service file header):
- Use only traditional Stellar `G...` addresses as issuers, never Soroban `C...` contract IDs
- Single-release: milestone `amount` must equal escrow `amount`
- Do not include `milestoneIndex` when funding a single-release escrow
- Do not include `receiverMemo` (server rejects it despite docs)

**Dispute flow**: `disputeService.ts` creates disputes tied to a `disputeId`. Admin resolves via `admin_release_dispute_funds.php`. Disputes have a chat and file attachment system.

**Platform currency**: USDC on Stellar (not XLM). XLM↔USDC swaps are handled by `soroswapService.ts` via the Soroswap API (amounts in stroops: 1 XLM = 10,000,000 stroops).

**i18n**: `I18nProvider.tsx` + `translations.ts` wrap the entire app. All user-facing strings should come from the translation system.

**Key config files**:
| File | Purpose |
|------|---------|
| `config/arcusxApi.ts` | URLs Edge: `arcusx-api` / `arcusx-admin` (requiere `VITE_SUPABASE_URL`) |
| `config/trustlessWork.ts` | Escrow API key, env, platform/admin wallets, `PLATFORM_FEE_BPS = 1.7` (1.7% ArcusX; 2% total al trabajador) |
| `config/commission.ts` | `DEFAULT_COMMISSION_RATE = 0.03`; preferir fee desde `system_config.platform_fee` / API |
| `config/supabase.ts` | Supabase client (graceful no-op if unconfigured) |
| `config/usdc.ts` | USDC issuer address |

**Vite build notes** (`vite.config.ts`):
- PWA is disabled by default (toggle with `ENABLE_PWA=true`) — kept off because service workers trigger antivirus false positives
- JS banners are injected into the bundle for the same AV reason
- `.htaccess` is auto-copied to `/dist` on every build for SPA routing on shared hosting

### Backend (Supabase)

Marketplace: función **`arcusx-api`** (`supabase/functions/arcusx-api/`) con router por `?action=`. Auth: JWT ArcusX + Supabase Auth. Datos: Postgres (`arcusx_*` tables). Admin: **`arcusx-admin`**. No hay PHP en el path de producción.

### CertiX (`CertiX/`)

Standalone Next.js 14 app (App Router). Issues and verifies blockchain certificates on Stellar. Uses Redis for response caching and Vercel Blob for certificate file storage. Deployed to Vercel (not arcusx.pro).

**Soroban smart contract** (`contracts/certificate/src/lib.rs`): Rust contract compiled to WASM. Functions: `register_certificate()`, `approve_certificate()`, `reject_certificate()`, `get_certificate()`. No auth required for registration (the transaction hash serves as proof of ownership); admin-only approval. Certificate data: `file_hash` (SHA256), `owner` (wallet address), `tx_hash`, `status` (Pending/Approved/Rejected).

API routes live under `CertiX/src/app/api/`: `certificate/upload`, `certificate/verify/[id]`, `certificate/user/[wallet]`, `validators/list`.

## Platform Fee

The platform fee is **2% total**, deducted from the **worker** on escrow release (`PLATFORM_FEE_BPS = 1.7` ArcusX share + 0.3% on-chain operation; `DEFAULT_COMMISSION_RATE = 0.017`). The **employer funds the posted amount with no platform surcharge**. Workers receive ~98% of the funded USDC. Any docs referring to 0.5%, 3% client-paid, or employer +2% bilateral UX are outdated.

## Switching from Testnet to Mainnet

Three places to change:
1. `arcusx/src/hooks/useWallet.ts` — `WalletNetwork.TESTNET` → `WalletNetwork.MAINNET` and `Networks.TESTNET` → `Networks.MAINNET`
2. `arcusx/.env` — `VITE_TRUSTLESS_WORK_BASE_URL=mainnet` and `VITE_STELLAR_NETWORK=mainnet`
3. Horizon server URL in `trustlessWorkEscrowService.ts` auto-detects via `VITE_STELLAR_NETWORK`, so env change covers it
