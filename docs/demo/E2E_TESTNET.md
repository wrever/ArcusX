# ArcusX — E2E demo script (Stellar Testnet)

Use this script for **reviewer demos**, **InstaAwards**, or **SDF** walkthroughs. Target duration: **8–12 minutes**.

## Prerequisites

1. **Freighter** (or xBull) on **Stellar Testnet**
2. Testnet USDC trustline to platform issuer (`arcusx/.env` → `VITE_USDC_ISSUER` / docs)
3. Two accounts recommended: **Client** and **Freelancer** (can be same machine, different browsers)
4. Local or staging:
   - Frontend: `cd arcusx && npm run dev` → http://localhost:5173
   - API: **Supabase Edge** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; **no** `VITE_USE_PHP_API=true`)
   - Smoke sin login: `node scripts/smoke-edge-api.mjs`
5. Env: `VITE_STELLAR_NETWORK=testnet`, Trustless Work **development** API key

## Demo flow

### 1. Landing & trust (1 min)

- Open `/` — point out **live stats** (open tasks, users, volume) from Edge `get_landing_market_stats` / RPC Supabase.
- Toggle **light theme** — navbar, hero, readable contrast.
- Connect wallet (Freighter) — show address + USDC badge in header.

### 2. Client: post task (2 min)

- Login (Google/GitHub OAuth).
- Dashboard → **Crear tarea** (or `/create-task`).
- Fill title, description, budget in **USDC**, category, difficulty → submit.
- Confirm task appears under **Mis tareas** / open marketplace.

### 3. Freelancer: apply (2 min)

- Second browser/incognito → login as freelancer.
- Find task → **Aplicar** → message + portfolio link.
- Verify wallet if prompted (Edge `verify_wallet`).

### 4. Client: select proposal & escrow (3 min)

- **Propuestas** → open task proposals.
- Review applicant card → **Seleccionar**.
- **Escrow popup:** Trustless Work creates/funds escrow (client signs in wallet).
- Note: funds locked until approval; platform fee **3%** on client side (Edge `get_platform_fee`).

### 5. Work & release (2 min)

- Freelancer: **Supervisar tarea** → mark milestone / work started.
- Client: approve completion → **release** (sign in Freighter).
- Show transaction on [Stellar Expert (testnet)](https://stellar.expert/explorer/testnet).

### 6. Optional: dispute path (1 min)

- Mention dispute button on supervise screen → admin resolution path (no live dispute required for short demo).

## Success criteria

- [ ] No 401 on apply/create with logged-in user
- [ ] Escrow `contractId` saved on task row
- [ ] Freelancer receives USDC (minus fee logic as designed)
- [ ] Light theme readable on landing, dashboard, settings, apply, proposals (escrow popup), supervise (blockchain card), wallet popup

## Troubleshooting

| Issue | Check |
|-------|--------|
| 401 on API | JWT in `localStorage.token`; `arcusxApiHeaders()` + Supabase anon key |
| CORS error | Origin in Supabase secret `ARCUSX_CORS_ORIGINS` |
| Escrow fails | Trustless Work env, testnet USDC balance, G-address issuers only |
| Stats show 0 | Supabase RPC / Edge `get_landing_market_stats`; revisar `VITE_SUPABASE_URL` |

## Recording tips

- 1080p, show wallet extension when signing.
- Narrate: *"Non-custodial — ArcusX never holds private keys."*
- End with block explorer link for funding/release tx.

---

*Week 3 — 2026-05-18 · Light-theme criteria updated Week 4 — 2026-05-28*
