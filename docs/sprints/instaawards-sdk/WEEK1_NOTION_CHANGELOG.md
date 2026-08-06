# ArcusX × Instawards — SOW 2 · Week 1 Changelog

**Track:** Production-Ready TypeScript SDK (`@arcusx/sdk`)  
**Engagement:** Instawards Statement of Work (SOW 2) — 30-day scoped sprint  
**Week:** 1 of 4  
**Status:** ✅ Complete (demo-ready / acceptance criteria met)  
**Builder:** Bruno Miranda · Chapter Chile  
**Primary evidence date:** 2026-07-30 (smoke PASS) · continued hardening through early August 2026  

This document is a **reviewer-facing changelog**: what Week 1 required, what shipped, how to verify it, and what is **in scope vs extra**.

---

## 1. One-sentence summary

Week 1 delivered the **public SDK contract** for SOW 2: typed `@arcusx/sdk` client over `https://api.arcusx.pro`, reconciled developer docs, sandbox API-key auth with valid **and** invalid credential handling, response envelopes, and automated smoke + demo scripts — same Edge API that powers [arcusx.pro](https://arcusx.pro), exposed as a stable integrator interface.

---

## 2. SOW context (what this sprint is)

| Item | Detail |
|------|--------|
| **Official SOW** | [`docs/sprints/SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
| **Delivery plan** | [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |
| **Week 1 packet** | [`docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md) |
| **Problem** | Platform works on Testnet; external builders still need internal endpoint knowledge |
| **Objective** | Typed SDK + docs + examples so third parties can create work, evidence, escrow, and payouts on **Stellar Testnet** |
| **Out of SOW (explicit)** | Mainnet launch · agent-to-agent payments · Python SDK · native Soroban escrow swap · multi-milestone · **large marketplace UI redesign** |

### Three SOW deliverables (full 30 days)

| # | Deliverable | Week 1 contribution |
|---|-------------|---------------------|
| **D1** | `@arcusx/sdk` core TypeScript package | ✅ Primary focus — contract, auth, modules surface, errors, envelopes |
| **D2** | Developer integration kit + award-style reference | 🟡 Foundations (docs + examples scaffolding); award flow = **Week 2** |
| **D3** | Testnet escrow lifecycle + release package | 🟡 Quote/status surface documented; full prepare/confirm E2E = **Week 3–4** |

---

## 3. Week 1 planned work → done

Source: SOW §5.1 Week 1 (`SOW2_DELIVERY_PLAN.md`).

| Planned | Status | Evidence |
|---------|--------|----------|
| Inventory `@arcusx/sdk`, modules, examples, REST coverage | ✅ | Package **v0.4.5** · `packages/arcusx-sdk/src/modules/` |
| Reconcile README / QUICKSTART / API_REFERENCE / package README | ✅ | `docs/sdk/*` + `packages/arcusx-sdk/README.md` |
| Define SOW 2 surface: public → webhooks | ✅ | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Verify sandbox API key + invalid-key JSON | ✅ | `scripts/smoke-sdk.mjs` · `scripts/demo-week1-sdk.mjs` |
| Document env vars, envelopes, errors | ✅ | [`QUICKSTART.md`](../../sdk/QUICKSTART.md) · [`PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md) · `.env.example` |

### Expected output (SOW) — checklist

- [x] Public SDK contract, authenticated client, typed errors, envelopes, module interfaces — buildable (`packages/arcusx-sdk`, `npm run build`)
- [x] `docs/sdk/README.md`, `QUICKSTART.md`, `API_REFERENCE.md`, and package README describe the implemented interface
- [x] Sandbox API key flow end-to-end: **valid** key via `https://api.arcusx.pro` + **missing/invalid** → HTTP **401** typed JSON

---

## 4. Architecture (integrator view)

```
Integrator app / script
        │
        ▼
  @arcusx/sdk  (TypeScript)  — REST /v1/
  Authorization: Bearer axk_test_…   (+ optional user JWT)
        │
        ▼
  https://api.arcusx.pro   ← partner gateway (default baseUrl)
        │
        ▼
  arcusx-api  (Supabase Edge)
        │
        ▼
  Postgres + escrow state → Stellar Testnet (Trustless Work)
  Wallet signs in integrator UI (ArcusX does not custody keys)
```

**Important:** The SDK is a **typed client** over the existing Edge API — not a parallel backend.

---

## 5. Deliverables shipped (Week 1 detail)

### 5.1 Package `@arcusx/sdk`

| Item | Detail |
|------|--------|
| Location | [`packages/arcusx-sdk/`](../../../packages/arcusx-sdk/) |
| Version | **0.4.5** |
| Entry | `ArcusXClient`, `ArcusXApiError`, `WalletAdapter` |
| Default base URL | `https://api.arcusx.pro` |
| Network | `network: 'testnet'` (header `x-arcusx-network`); mainnet supported in client, **not** a Week 1 launch deliverable |

### 5.2 Module surface (SOW 2)

| Namespace | Purpose | Week 1 |
|-----------|---------|--------|
| `public` | Market stats, platform fee, task listings | ✅ In scope |
| `marketplace` | Create / apply / proposals / cancel | ✅ In scope |
| `private` | Private 1:1 offer lifecycle | ✅ In scope |
| `deals` | Shareable payment links (`deal_token`) | ✅ In scope |
| `escrow` | Quote + prepare/confirm lifecycle | ✅ Surface defined |
| `settlement` | `completeTask` / `markDealReleased` | ✅ Surface defined |
| `evidence` | Milestone / deal evidence | ✅ In scope |
| `ratings` | Create + user summary | ✅ In scope |
| `webhooks` | List deliveries + HMAC `verifySignature` | ✅ Helpers stable |
| `disputes` / `trust` | Available in package | Advanced / not Week 1 focus |
| `agent` | Agent jobs / subjobs | ❌ **Out of SOW 2** (exists in package; not Week 1 deliverable) |

### 5.3 Auth & errors

| Mode | What the SDK sends | Use |
|------|--------------------|-----|
| Partner only | `Authorization: Bearer axk_test_…` | Server / CI / smoke |
| User + partner | `Bearer <app JWT>` + `x-arcusx-api-key: axk_…` | User-scoped mutations |
| Missing key | — | `401` · `missing_api_key` |
| Invalid / revoked key | — | `401` · `invalid_api_key` |
| Rate limit | — | `429` · `rate_limit_exceeded` (~60/min sandbox) |

**Typed error class:** `ArcusXApiError` → `status`, `code`, `message`, `requestId`, `raw`  
**Path:** [`packages/arcusx-sdk/src/errors.ts`](../../../packages/arcusx-sdk/src/errors.ts)

**REST `/v1` envelope (success):**

```json
{ "success": true, "data": { }, "meta": { "request_id": "…", "api_version": "v1" } }
```

**REST `/v1` envelope (error):**

```json
{
  "success": false,
  "error": { "code": "invalid_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

Docs: [`PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md)

### 5.4 Documentation (in-repo — Week 1 contract)

| Doc | Role |
|-----|------|
| [`docs/sdk/README.md`](../../sdk/README.md) | Index / orientation |
| [`docs/sdk/QUICKSTART.md`](../../sdk/QUICKSTART.md) | Install → first calls |
| [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) | Module / method contract |
| [`docs/sdk/PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md) | Keys, headers, negatives |
| [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) | 2% worker-paid; quote from API |
| [`packages/arcusx-sdk/README.md`](../../../packages/arcusx-sdk/README.md) | Package landing |

### 5.5 Verification scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Smoke (strict) | `cd packages/arcusx-sdk && npm run smoke:strict` | Edge + gateway valid + 401 missing/invalid + envelopes |
| Week 1 demo | `npm run demo:week1` | Short walkthrough for screen recording / reviewer |
| Key mint (maintainers) | `node scripts/generate-partner-key.mjs --slug … --sandbox` | Sandbox `axk_test_…` |

Implementation: [`scripts/smoke-sdk.mjs`](../../../scripts/smoke-sdk.mjs) · [`scripts/demo-week1-sdk.mjs`](../../../scripts/demo-week1-sdk.mjs)

### 5.6 Smoke result (recorded 2026-07-30)

```
A) Edge public …
B) Gateway valid key: https://api.arcusx.pro
C) Auth negatives …
✓ edge.public.*
✓ gateway.public.getPlatformFee / getMarketStats / getTasks
✓ gateway.envelope.success
✓ auth.missing_api_key — 401 missing_api_key
✓ auth.invalid_api_key — 401 invalid_api_key
✓ gateway.envelope.error
✓ client.requires_credentials
Week 1 smoke PASS
```

**Secrets:** API keys live only in local `arcusx/.env` — never committed.

---

## 6. How a reviewer verifies Week 1 (10 minutes)

```bash
# 1) Build
cd packages/arcusx-sdk
npm install && npm run build

# 2) Env (local only — never commit)
# ARCUSX_API_KEY=axk_test_…

# 3) Demo walkthrough
npm run demo:week1

# 4) Full smoke matrix
npm run smoke:strict
```

Optional live checks:

- Gateway health via SDK: `ax.public.getPlatformFee()` / `getMarketStats()`
- Partner docs (public site): [https://docs.arcusx.pro/developers](https://docs.arcusx.pro/developers) *(see §8 — DX bonus)*
- App Developer panel (keys): [https://arcusx.pro](https://arcusx.pro) → Settings → Developer

---

## 7. Acceptance criteria (Week 1)

| Criterion | Met |
|-----------|-----|
| `packages/arcusx-sdk` builds | ✅ |
| Docs aligned with v0.4.5 public interface | ✅ |
| Partner auth docs match Bearer `axk_` + gateway | ✅ |
| Smoke covers **valid** sandbox key on gateway | ✅ |
| Smoke covers missing + invalid key envelopes | ✅ |
| Demo script for reviewer walkthrough | ✅ |
| No secrets in git | ✅ |

**Verdict:** Week 1 SOW objectives are **fulfilled**.

---

## 8. In scope vs extras (important for reviewers)

### 8.1 Strictly Week 1 (SOW §5.1) — required

- SDK inventory + module surface definition  
- Reconciled `docs/sdk/*` + package README  
- Sandbox auth (valid / missing / invalid)  
- Envelopes + `ArcusXApiError`  
- Smoke + demo scripts  

### 8.2 SOW-aligned but scheduled later (early / partial work OK)

| Work | Official week | Notes |
|------|---------------|-------|
| Award-style reference flow (SDK-only) | **Week 2** | Not claimed as Week 1 complete |
| Full escrow prepare → sign → confirm E2E on Testnet | **Week 3** | Surface + docs exist; lifecycle demo is later |
| SDK playground polish + webhook story expansion | **Week 3** | Scaffolding exists under `examples/sdk-playground/` |
| Final release package + changelog + known limitations | **Week 4** | |

Node examples under `examples/sdk-node-*` support Deliverable 2 but are **not** the sole Week 1 acceptance gate.

### 8.3 Extras (not required by Week 1 SOW)

These improve integrator DX or product UX. They **do not** replace Week 1 acceptance and are **not** billed as Week 1 SOW obligations.

#### A) Public docs site `docs.arcusx.pro` (React SPA)

| Question | Answer |
|----------|--------|
| Is a public docs site in the SOW? | **Documentation** is part of Deliverable 2 (DX). Week 1 explicitly requires **`docs/sdk/*.md`**, not a separate marketing/docs hostname. |
| Is the React docs app on `docs.*` Week 1? | **Bonus / early DX.** Closest formal home is broader DX + Week 3/4 docs packaging — **not** listed in Week 1 expected output. |
| What shipped? | Hostname-aware React docs (`isDocsLandingHost`), SDK-focused IA (Overview, Quickstart, Auth, Modules, Escrow, Errors), ⌘K search, TOC, code copy, AI-paste briefs, SPA `.htaccess` for deep links |
| Live | [https://docs.arcusx.pro](https://docs.arcusx.pro) · [https://docs.arcusx.pro/developers](https://docs.arcusx.pro/developers) |
| Deploy note | Same `arcusx/dist` as the app; document root must include SPA `.htaccess` or deep URLs 404 on LiteSpeed |

#### B) “Pollar-style” documentation UX

| Question | Answer |
|----------|--------|
| Is there a Pollar product integration? | **No.** Zero API/SDK coupling to [Pollar](https://docs.pollar.xyz/docs). |
| What was done? | **UX reference only** — three-column docs layout, search, TOC, denser integrator content (common pattern among Stellar infra docs). |
| SOW classification | **Extra** (design inspiration for our own docs). |

#### C) Marketplace job-board filter UI unification

| Question | Answer |
|----------|--------|
| In SOW? | **No.** SOW explicitly excludes *large ArcusX marketplace UI redesign*. |
| What changed? | Unified filter card; “Remote only” as chip (not a detached toggle). |
| Classification | **Extra** (product polish). |

---

## 9. Key public URLs & repo paths

### Live

| Resource | URL |
|----------|-----|
| App | [https://arcusx.pro](https://arcusx.pro) |
| Partner API gateway | [https://api.arcusx.pro](https://api.arcusx.pro) |
| Public developer docs | [https://docs.arcusx.pro/developers](https://docs.arcusx.pro/developers) |
| Quickstart (public) | [https://docs.arcusx.pro/developers/quickstart](https://docs.arcusx.pro/developers/quickstart) |
| Auth / errors (public) | [https://docs.arcusx.pro/developers/auth](https://docs.arcusx.pro/developers/auth) · […/errors](https://docs.arcusx.pro/developers/errors) |

### Repository (relative to monorepo root)

| Path | Why it matters |
|------|----------------|
| `packages/arcusx-sdk/` | D1 package |
| `docs/sdk/` | Week 1 contract docs |
| `docs/sprints/SOW2_DELIVERY_PLAN.md` | SOW execution plan |
| `docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md` | Week 1 packet |
| `scripts/smoke-sdk.mjs` | Automated acceptance |
| `scripts/demo-week1-sdk.mjs` | Reviewer demo |
| `examples/sdk-node-*` · `examples/sdk-playground/` | DX kit (Weeks 2–3 weight) |
| `arcusx/src/content/docs/` · `arcusx/src/pages/docs/` | Public docs SPA (**extra**) |
| `arcusx/public/.htaccess` | SPA rewrite for `docs.*` / app routes |

---

## 10. Fee & custody facts (integrator-critical)

| Rule | Detail |
|------|--------|
| Platform fee | **2%** total, paid by the **worker** on release |
| Client funds | Exact **nominal** task/deal amount (no employer surcharge) |
| Source of truth | `public.getPlatformFee()` + `escrow.quote()` — **do not hardcode %** |
| Custody | ArcusX does **not** hold funds or private keys |
| On-chain pattern | `prepare*` → `WalletAdapter.signTransaction` → `confirm*(tx_hash)` |
| Addresses | Stellar `G…` only (never `C…` as user/issuer wallet) |

---

## 11. Known limitations (honest, Week 1)

- Full Testnet **fund/release** end-to-end demo with recorded tx hashes is a **Week 3–4** evidence item, not the Week 1 gate.
- Award-style reference app (SDK-only path) is **Week 2**.
- `agent.*` remains in the package for future tracks; **out of SOW 2**.
- Mainnet is client-ready but **not** a deliverable of this Instaward.
- Public `docs.arcusx.pro` deep links require SPA `.htaccess` on the docs document root (hosting config, not SDK logic).

---

## 12. Next (Week 2 preview)

Per SOW §5.1 Week 2:

1. Refine modules needed for the agreed surface  
2. Award-style validation scenario using **SDK calls only** (create → evidence → winner/assignee → escrow-ready)  
3. Idempotency / sandbox attribution where applicable  
4. Update Node examples for the core flow  

Packet (when ready): `docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK2.md`

---

## 13. Changelog-style bullet list (copy for Notion “Updates”)

### SDK & API (Week 1 — required)

- Shipped `@arcusx/sdk` **v0.4.5** with `ArcusXClient` + modular namespaces  
- Default transport REST `/v1` via `https://api.arcusx.pro`  
- Partner auth `Bearer axk_test_…` + user JWT mode documented and smoke-tested  
- Typed `ArcusXApiError` and JSON envelopes (`success` / `error` / `meta`)  
- Auth negatives: `missing_api_key`, `invalid_api_key`  
- Reconciled QUICKSTART, API_REFERENCE, PARTNER_AUTH, FEE_MODEL, package README  
- `npm run smoke:strict` and `npm run demo:week1` for reviewers  

### Developer experience (bonus / early)

- Public docs SPA at `docs.arcusx.pro` focused on SDK integration (Overview → Errors)  
- Search ⌘K, on-page TOC, copyable code, AI paste briefs  
- App footer / navbar / Developer settings link to current docs routes  
- SPA `.htaccess` hardening for LiteSpeed deep links  

### Explicitly not Week 1 SOW

- Pollar product integration (none — UX reference only)  
- Marketplace filter UI redesign (product polish only)  
- Award reference E2E (Week 2) · full escrow Testnet lifecycle proof (Week 3–4) · mainnet  

---

## 14. Bottom line for the reviewing committee

| Question | Answer |
|----------|--------|
| Did Week 1 meet SOW §5.1 expected output? | **Yes** |
| Is the SDK usable by an external integrator on Testnet sandbox today? | **Yes** — install, key, `public.*`, typed errors, documented modules |
| Are Pollar-related items part of the SOW? | **No** — docs UX inspiration only |
| Is `docs.arcusx.pro` a Week 1 gate? | **No** — valuable DX bonus that supports Deliverable 2; Week 1 gate is `docs/sdk/*` + package + smoke |
| What proves completion? | This changelog + [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md) + smoke PASS log + repo paths above |

---

*Prepared for Notion / Instawards review · ArcusX SOW 2 · Week 1 · confidential to review process as needed.*
