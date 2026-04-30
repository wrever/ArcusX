# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

ArcusX is a decentralized freelancing platform on the Stellar blockchain. The repo contains three independent sub-projects:

- **`arcusx/`** — Main React 19 + TypeScript + Vite frontend (freelancing marketplace)
- **`backend_externo/`** — PHP REST API with MySQL (authentication, task management, escrow coordination)
- **`CertiX/`** — Next.js 14 app for blockchain-based verifiable certifications (separate product)
- **`Miraes/`** — Separate project (minimal, standalone)

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

### backend_externo (PHP)
```bash
cd backend_externo
composer install     # Install PHP dependencies (Firebase JWT)
# Serve via a local PHP server or configure Apache/Nginx pointing to this directory
```

### CertiX
```bash
cd CertiX
npm install
npm run dev          # Next.js dev server
npm run build        # Production build
npm run clean        # Wipe all blockchain data (runs scripts/clean-all-data.ts)
```

## Environment Setup (`arcusx/.env`)

Required variables for local development:
```
VITE_TRUSTLESS_WORK_API_KEY=<from Trustless Work dashboard>
VITE_TRUSTLESS_WORK_BASE_URL=development   # or 'mainnet'
VITE_PLATFORM_WALLET=<Stellar G... address>
VITE_ADMIN_WALLET=<Stellar G... address>
VITE_STELLAR_NETWORK=testnet               # or 'mainnet'
VITE_SUPABASE_URL=<supabase project URL>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
# VITE_API_URL=http://arcusx.pro/api       # optional; defaults to arcusx.pro/api
```

## Architecture

### Frontend (`arcusx/src/`)

**Routing** (`App.tsx`): React Router v6 with lazy-loaded routes. The app detects if it's running on the enterprise subdomain via `isEnterpriseLandingHost()` (`config/enterpriseSite.ts`) and renders a completely different landing (`EmpresasPage`) with its own navbar.

**Authentication** — two parallel systems:
- Custom JWT via PHP backend (`authService.ts` → `backend_externo/auth/*.php`). Token and user stored in `localStorage`.
- Supabase for OAuth (Google/GitHub) via `config/supabase.ts`. Falls back gracefully if Supabase env vars are missing.
- `useAuth` hook polls `localStorage` every 500ms to detect same-tab auth changes.

**Wallet** (`hooks/useWallet.ts`): Freighter-only via `@creit.tech/stellar-wallets-kit`. Currently hardcoded to `WalletNetwork.TESTNET` — change here and in `networkPassphrase` (and flip `VITE_TRUSTLESS_WORK_BASE_URL` to `mainnet`) to go to production.

**Escrow flow** (`services/trustlessWorkEscrowService.ts`):
1. Client selects proposal → `ProposalReview.tsx` creates escrow via Trustless Work API
2. Client funds escrow → `EscrowProcessPopup.tsx` handles the multi-step UI
3. Freelancer marks milestone complete → `SuperviseTask.tsx`
4. Client approves and releases funds → 0.3% platform fee auto-deducted

Critical escrow rules (documented in the service file header):
- Use only traditional Stellar `G...` addresses as issuers, never Soroban `C...` contract IDs
- Single-release: milestone `amount` must equal escrow `amount`
- Do not include `milestoneIndex` when funding a single-release escrow
- Do not include `receiverMemo` (server rejects it despite docs)

**Platform currency**: USDC on Stellar (not XLM). XLM↔USDC swaps are handled by `soroswapService.ts` via the Soroswap API (amounts in stroops: 1 XLM = 10,000,000 stroops).

**i18n**: `I18nProvider.tsx` + `translations.ts` wrap the entire app. All user-facing strings should come from the translation system.

**Key config files**:
| File | Purpose |
|------|---------|
| `config/database.ts` | Backend API base URL |
| `config/trustlessWork.ts` | Trustless Work API key, env, platform/admin wallets, fee (0.3%) |
| `config/supabase.ts` | Supabase client (graceful no-op if unconfigured) |
| `config/usdc.ts` | USDC issuer address |

### Backend (`backend_externo/`)

Flat PHP files, each a self-contained REST endpoint. `config.php` establishes the MySQL connection and JWT secret. CORS headers are handled by `.htaccess`, not by PHP. Each endpoint handles its own OPTIONS preflight.

### CertiX (`CertiX/`)

Standalone Next.js 14 app (App Router). Issues and verifies blockchain certificates on Stellar. Uses Redis for caching and Vercel Blob for file storage. Not deployed from the same host as `arcusx`.

## Switching from Testnet to Mainnet

Three places to change:
1. `arcusx/src/hooks/useWallet.ts` — `WalletNetwork.TESTNET` → `WalletNetwork.MAINNET` and `Networks.TESTNET` → `Networks.MAINNET`
2. `arcusx/.env` — `VITE_TRUSTLESS_WORK_BASE_URL=mainnet` and `VITE_STELLAR_NETWORK=mainnet`
3. Horizon server URL in `trustlessWorkEscrowService.ts` auto-detects via `VITE_STELLAR_NETWORK`, so env change covers it
