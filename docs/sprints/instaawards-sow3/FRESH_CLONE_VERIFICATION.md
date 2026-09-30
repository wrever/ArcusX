# Fresh-clone verification — Agentic foundation (SOW 3 · Week 4)

**Purpose:** Prove a clean checkout builds `@arcusx/sdk`, runs Weeks 1–4 smoke/demo, and matches the agentic docs on **Stellar Testnet**.  
**Audience:** reviewers / Ambassador Chapter  
**Requires:** Node ≥ 18, npm, sandbox partner key `axk_test_…` (**ask builder / Ambassador** — not in git)  
**Closeout:** SOW 3 **CLOSED** · live evidence already frozen in [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md)

---

## 1. Clone and build

```bash
git clone https://github.com/wrever/ArcusX.git
cd ArcusX
git checkout v3.8.3   # or ArcusX3.8
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

# Optional live E2E (not required for dry smoke):
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
npm run smoke:sow3:week4                  # closeout package + LIVE_E2E frozen
npm run demo:sow3:week4
```

| Script | Expect |
|--------|--------|
| week1 smoke | Auth negatives + create/get job |
| week2 smoke | Fund/release prepare typed 4xx + Idempotency-Key |
| week3 smoke | Keypair export + pay helpers; live skip without secret |
| week4 smoke | Docs package present + LIVE_E2E frozen + regression create |

---

## 4. On-chain evidence (already frozen)

Do **not** re-fill [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) — it is **FROZEN** for SOW closeout.

Optional: re-run Freighter / keypair live path for your own wallet; keep secrets out of git.

```bash
cd local-test && npm install && npm run dev
# http://localhost:5200
```

---

## 5. Docs sanity

All must resolve under `docs/sprints/instaawards-sow3/`:

- `AGENTIC_QUICKSTART.md`
- `KNOWN_LIMITATIONS.md`
- `SECURITY_NOTES.md`
- `SOW3_MVP_SURFACE.md`
- `INSTAAWARDS_SOW3_WEEK{1,2,3,4}.md`
- `evidence/LIVE_E2E.md` (**FROZEN**)

---

## Pass criteria (reviewer)

- [x] Package builds (`npm run build` in `packages/arcusx-sdk`)
- [x] Weeks 1–4 smoke pass dry with sandbox key (re-verified at closeout)
- [x] `demo:sow3:week4` OK
- [x] Docs listed above exist
- [x] `evidence/LIVE_E2E.md` has real Expert links (fund / approve / release)

**Network:** Testnet only. Mainnet → [`MAINNET_READINESS.md`](./MAINNET_READINESS.md).
