# Fresh-clone verification — Agentic foundation (SOW 3 · Week 4)

**Purpose:** Prove a clean checkout builds `@arcusx/sdk`, runs Weeks 1–4 smoke/demo, and matches the agentic docs on **Stellar Testnet**.  
**Audience:** reviewers / Ambassador Chapter  
**Requires:** Node ≥ 18, npm, sandbox partner key `axk_test_…`

---

## 1. Clone and build

```bash
git clone https://github.com/wrever/ArcusX.git
cd ArcusX
git checkout ArcusX3.8   # or tag v3.8.3 when published
cd packages/arcusx-sdk
npm install
npm run build
# optional peer for live keypair signing:
npm install @stellar/stellar-sdk
```

Expect: `dist/` with typings; no TypeScript errors.

---

## 2. Environment

Create `arcusx/.env` (gitignored) from `packages/arcusx-sdk/.env.example`:

```bash
ARCUSX_API_KEY=axk_test_…
# ARCUSX_API_URL=https://api.arcusx.pro   # default

# Live E2E only (never commit):
# PAYER_SECRET_KEY=S…
# AGENTIC_EXECUTOR_USER_ID=…
# AGENTIC_EXECUTOR_WALLET=G…
```

Invalid / missing keys must fail with typed HTTP errors (Week 1 smoke covers this).

---

## 3. Smoke and demos (required)

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week1   # 9/9
SMOKE_STRICT=1 npm run smoke:sow3:week2   # 10/10
npm run smoke:sow3:week3                  # 7/7 dry
npm run smoke:sow3:week4                  # package / docs closeout
npm run demo:sow3:week1
npm run demo:sow3:week2
npm run demo:sow3:week3
npm run demo:sow3:week4
```

| Script | Expect |
|--------|--------|
| week1 smoke | Auth negatives + create/get job |
| week2 smoke | Fund/release prepare typed 4xx + Idempotency-Key |
| week3 smoke | Keypair export + pay helpers; live skip without secret |
| week4 smoke | Docs package present + regression create |

---

## 4. Optional live on-chain

```bash
export PAYER_SECRET_KEY=S…
export AGENTIC_EXECUTOR_USER_ID=…
npm run demo:sow3:week3
# Paste hashes into docs/sprints/instaawards-sow3/evidence/LIVE_E2E.md
```

Or Freighter UI:

```bash
cd local-test && npm install && npm run dev
# http://localhost:5200 — fund+release with payer wallet
```

---

## 5. Docs sanity

All must resolve under `docs/sprints/instaawards-sow3/`:

- `AGENTIC_QUICKSTART.md`
- `KNOWN_LIMITATIONS.md`
- `SECURITY_NOTES.md`
- `SOW3_MVP_SURFACE.md`
- `INSTAAWARDS_SOW3_WEEK{1,2,3,4}.md`
- `evidence/LIVE_E2E.md`

---

## Pass criteria

- [ ] `npm run build` succeeds
- [ ] Weeks 1–4 smoke pass (dry) with valid sandbox key
- [ ] At least one demo script prints expected next steps without uncaught errors
- [ ] Docs listed above exist
- [ ] (Closeout) `evidence/LIVE_E2E.md` has real Expert links for fund + release

**Network:** Testnet only. Mainnet → [`MAINNET_READINESS.md`](./MAINNET_READINESS.md).
