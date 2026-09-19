# Fresh-clone verification — `@arcusx/sdk` (SOW 2 · Week 4)

**Purpose:** Prove a clean checkout can build the SDK, run smoke/demo, and start documented examples on **Stellar Testnet**.  
**Audience:** reviewers / integrators  
**Requires:** Node ≥ 18, npm, a sandbox partner API key (`axk_test_…`)

---

## 1. Clone and build

```bash
git clone https://github.com/<org>/ArcusX.git
cd ArcusX
cd packages/arcusx-sdk
npm install
npm run build
```

Expect: `dist/` with `index.js` + typings; no TypeScript errors.

---

## 2. Environment

Create `examples/sdk-node-escrow/.env` (or export in the shell):

```bash
ARCUSX_API_KEY=axk_test_…
# optional — defaults to production partner gateway
# ARCUSX_API_BASE=https://api.arcusx.pro
```

Do **not** commit secrets. Invalid / missing keys must fail with clear HTTP errors (smoke covers this).

---

## 3. Smoke and demos

```bash
cd packages/arcusx-sdk
npm run smoke:strict
npm run demo:week3
npm run demo:week4
```

| Script | Expect |
|--------|--------|
| `smoke:strict` | Public reads, auth, quote/status paths, typed errors |
| `demo:week3` | Escrow quote + webhook pointer |
| `demo:week4` | Release-package walkthrough (build + smoke + doc pointers) |

---

## 4. Node examples

```bash
cd examples/sdk-node-escrow
cp .env.example .env   # set ARCUSX_API_KEY
npm install && npm start

cd ../sdk-node-webhooks
cp .env.example .env
npm install && npm start

cd ../sdk-node-award
# needs client + worker JWTs as documented in README
npm install && npm start
```

---

## 5. Playground (optional browser)

```bash
cd examples/sdk-playground
cp .env.example .env
npm install && npm run dev
```

Open the printed localhost URL. Tabs: award→ready, escrow rail, webhooks, partner suite.

---

## 6. Partner Freighter harness (optional on-chain)

```bash
cd local-test
npm install && npm run dev
```

Open http://localhost:5200 — API key → deploy → fund → liberate (client Freighter ×2: approve → release). Inspect contracts on Stellar Expert (Testnet).

---

## Pass criteria

- [ ] `npm run build` succeeds in `packages/arcusx-sdk`
- [ ] `npm run smoke:strict` passes with a valid sandbox key
- [ ] At least one Node example starts without uncaught errors
- [ ] Docs linked from [`docs/sdk/README.md`](./README.md) resolve

**Network:** Testnet only for SOW 2. Mainnet is not part of this verification — see [`MAINNET_READINESS.md`](./MAINNET_READINESS.md).
