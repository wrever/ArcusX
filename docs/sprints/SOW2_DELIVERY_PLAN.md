# ArcusX SOW 2 Delivery Plan — SDK Validation with SDF Award Scenario

**Document for technical reviewers.** It describes the scope of work for the second post-funding month: issues addressed, weekly deliverables, and verification criteria. The sprint focuses on improving the ArcusX SDK by using an SDF award-style scenario as the reviewer-facing validation flow built on top of ArcusX APIs and Stellar USDC escrow.

**Mainnet is not the delivery target for this SOW.** All verification is expected on Stellar Testnet with Trustless Work escrow, partner API keys, SDK examples, and reviewer-ready smoke tests. Mainnet readiness can be documented as a checklist, but not counted as a core deliverable.

---

## 1. Executive Summary

| Area | Scope for the month |
| --- | --- |
| **SDK Productization** | Reconcile SDK docs with the current `@arcusx/sdk` implementation; complete missing modules and examples so an external app can create, manage, and settle work through ArcusX. |
| **SDF Award Validation Scenario** | Use an award-style flow as the validation scenario: campaigns/awards, submissions, winner selection, escrow quote, escrow funding, evidence, payout release, and status tracking through the SDK. |
| **Partner API / Auth** | Harden partner API key usage, idempotency, JSON envelopes, partner attribution, limits, and auditability for SDK-based integrations. |
| **Escrow and Stellar UX** | Keep Stellar operations on Testnet; ensure create/fund/approve/release flows are reliable, rate-limited, documented, and observable through SDK examples and playground flows. |
| **SDK Examples / Playground** | Provide runnable SDK examples and a lightweight playground that prove the integration path without adding new agent-to-agent payment scope. |
| **Documentation and Reviewer Pack** | Delivery plan, architecture document, SDK quickstart, API reference, smoke scripts, demo script, sandbox key instructions, and a concise verification checklist. |

---

## 2. Scope Principles

| Principle | Decision |
| --- | --- |
| Primary objective | Improve ArcusX as an SDK/API product, not build a standalone award product. |
| Completion target | Reach 100% coverage of the agreed SDK surface for this SOW: public, marketplace, private offers, deals, escrow, evidence, ratings, webhooks, examples, and smoke verification. |
| Demo app role | The SDF award-style flow is a validation scenario that exposes SDK gaps and proves the integration story; it does not imply a partner or association relationship. |
| Network | Stellar Testnet only for required verification. |
| Mainnet | Out of scope for delivery; include checklist and risks only. |
| Escrow model | Trustless Work single-release USDC escrow remains the payment primitive. |
| Reviewer expectation | Reviewer must be able to run examples or smoke scripts with a sandbox key and see concrete API/SDK behavior. |

---

## 3. Technical Issues Addressed

### 3.1 SDK Coverage and Documentation Drift

| Issue | Location / context | Committed solution |
| --- | --- | --- |
| SDK docs lag behind implementation | `docs/sdk/*`, `packages/arcusx-sdk/*` | Reconcile version, module list, supported methods, examples, and quickstart so docs reflect the actual SDK. |
| API surface unclear for integrators | `docs/sdk/API_REFERENCE.md`, `docs/sdk/openapi-v1.yaml` | Publish a reviewer-facing contract for public, marketplace, private, deals, escrow, evidence, ratings, and webhooks. |
| SDK examples fragmented | `examples/sdk-node-*`, `examples/sdk-playground` | Standardize env vars, run instructions, expected outputs, and failure messages. |
| Missing high-confidence smoke | `scripts/smoke-sdk.mjs` | Expand smoke beyond public endpoints: partner auth, create/list flows, escrow quote/prepare, and example health checks. |

### 3.2 SDF Award Scenario Gaps

| Issue | Location / context | Committed solution |
| --- | --- | --- |
| No reviewer-facing scenario exercising broad platform features | `docs/sprints/instaawards-sdk/*`, examples | Define award-style flows that consume SDK modules instead of calling raw ArcusX endpoints. |
| Awards/submissions need work-execution semantics | SDK marketplace/deals/evidence modules | Model awards as work opportunities or deal-like records with evidence and conditional payout. |
| Winner payout needs escrow path | SDK escrow + Trustless Work Testnet | Quote, prepare, fund, approve, and release USDC escrow through SDK-guided flows. |
| Reviewer needs visible proof | `examples/sdk-playground`, demo script | Add a simple playground/demo path showing campaign → submission → winner → escrow → payout. |

### 3.3 Partner API and Platform Reliability

| Issue | Location / context | Committed solution |
| --- | --- | --- |
| Partner attribution must be consistent | Supabase Edge API, `partner_id`, SDK auth | Ensure SDK-created resources carry partner identity and idempotency metadata. |
| Edge response shape must be integrator-friendly | REST `/v1`, JSON envelope | Standardize success/error format and document HTTP status codes. |
| Rate-limit risk from Trustless Work indexer polling | Deal and escrow chain-state flows | Use stable refs, bounded polling, and cache/refresh actions rather than render-triggered loops. |
| Secret exposure risk | SDK docs and examples | Keep Trustless Work API keys server-side or reviewer-local only; document sandbox keys without committing secrets. |

---

## 4. Weekly Deliverables

### Week 1 | SDK Contract, Docs Reconciliation, and Partner Baseline

| Goal | Deliverable | Suggested verification |
| --- | --- | --- |
| 1 | SDK inventory: actual modules, methods, current version, examples, and REST coverage documented | `docs/sdk/API_REFERENCE.md`, `docs/sdk/README.md`, and package README agree with `packages/arcusx-sdk/src`. |
| 2 | Partner auth and idempotency baseline documented and verified | Sandbox API key can call a protected `/v1` route; invalid key returns JSON 401/403. |
| 3 | Award scenario spec written as SDK use cases | Document maps campaigns, submissions, evidence, winner selection, and payout to SDK modules. |

**Week 1 definition of done:** A reviewer can understand what the SDK supports today, how an integration authenticates, and exactly which award-style flows will exercise the SDK.

### Week 2 | Award Scenario Through SDK

| Goal | Deliverable | Suggested verification |
| --- | --- | --- |
| 1 | Award scenario uses SDK for core work objects | Demo script or example creates/list work entries or award opportunities through `@arcusx/sdk`, not raw fetch calls. |
| 2 | Submission and evidence flow through SDK | Evidence/submission metadata is attached and retrievable with partner attribution. |
| 3 | Winner selection creates escrow-ready payout state | SDK can compute payout quote and produce the next escrow action for the winner. |

**Week 2 definition of done:** The award-style flow can run an end-to-end non-mainnet scenario up to “winner selected and escrow quote ready” using the SDK.

### Week 3 | Escrow, SDK Playground, and Webhook/Callback Proof

| Goal | Deliverable | Suggested verification |
| --- | --- | --- |
| 1 | Testnet escrow flow works from SDK-guided examples | Quote → prepare deploy/fund → confirm tx hash → status read succeeds with bounded indexer calls. |
| 2 | SDK playground covers the award-style flow | Playground or Node script demonstrates award/work creation, evidence, winner selection, escrow quote, and payout status. |
| 3 | Webhook/callback story is documented and smoke-tested | HMAC/callback example validates payload and records status without exposing secrets. |

**Week 3 definition of done:** The SDK demonstrates the differentiated ArcusX value: external apps can create work, attach evidence, and settle conditional Stellar USDC payouts through ArcusX.

### Week 4 | QA, Reviewer Pack, and Testnet Demo Close

| Goal | Deliverable | Suggested verification |
| --- | --- | --- |
| 1 | Reviewer smoke scripts and quickstarts are stable | Fresh clone + env vars + sandbox key can run documented SDK examples on Testnet. |
| 2 | Award demo package is ready | Demo script or recording: create award → submit evidence → select winner → fund escrow → release payout. |
| 3 | Mainnet readiness documented, not delivered | Checklist lists wallets, USDC trustlines, keys, fee config, smoke amount, rollback plan, and known risks. |

**Week 4 definition of done:** A technical reviewer can verify the SDK integration story without relying on private context or manual explanation.

---

## 5. Success Criteria for the Month

- **SDK:** Documentation, package README, examples, and current code agree on modules, methods, version, and env vars.
- **Award scenario:** At least one end-to-end Testnet demo uses the SDK as the integration layer.
- **Partner API:** Sandbox key flow is documented and protected routes reject invalid credentials with clear JSON errors.
- **Escrow:** Testnet USDC escrow path is demonstrable through SDK-guided flows without runaway indexer requests.
- **SDK examples:** Runnable examples prove partner auth, award-style work/evidence, escrow quote, and payout release status.
- **Reviewer pack:** Delivery plan, architecture, quickstart, API reference, smoke commands, expected outputs, and demo script are included.

---

## 6. Out of Scope

| Area | Reason |
| --- | --- |
| Mainnet launch | This SOW focuses on SDK/product readiness and Testnet verification. |
| Native Soroban escrow replacement | Trustless Work remains the escrow provider for this sprint. |
| Python SDK | TypeScript SDK is the package in scope. |
| Full award product launch | The SDF award-style flow is a validation scenario, not a partner relationship, associated product, or final customer-facing product deliverable. |
| Multi-milestone escrow | Single-release escrow remains the stable baseline. |
| Agent-to-agent payments / job-subjob settlement | Too large for this month; this SOW focuses on SDK readiness and the award-style validation flow. |
| Large UI redesign | Only SDK/playground/demo UI needed for reviewer verification is in scope. |

---

## 7. Reviewer Checklist

| Check | Expected result |
| --- | --- |
| Install SDK | `npm install` succeeds in SDK examples. |
| Public read smoke | Public endpoints return valid JSON envelope. |
| Partner auth smoke | Valid sandbox key passes; invalid key fails with JSON 401/403. |
| Award flow | Campaign/award, submission/evidence, winner, and payout state are created through SDK calls. |
| Escrow flow | Testnet quote and escrow steps produce expected tx hashes/status without excessive polling. |
| SDK examples | Node/playground examples demonstrate the integration path without agent-to-agent payment scope. |
| Documentation | Delivery plan, architecture, quickstart, API reference, and demo script are aligned. |

---

## 8. Evidence Package

The end-of-month reviewer package should include:

- `docs/sprints/SOW2_DELIVERY_PLAN.md`
- `docs/sprints/SOW2_ARCHITECTURE.md`
- Updated `docs/sdk/README.md`
- Updated `docs/sdk/QUICKSTART.md`
- Updated `docs/sdk/API_REFERENCE.md`
- Updated `docs/sdk/openapi-v1.yaml` if REST contract changes
- SDK examples that cover marketplace/private/deals/escrow and the award-style flow
- `examples/sdk-playground`
- `scripts/smoke-sdk.mjs`
- Demo script or recording notes for the award-style SDK flow

---

**Version:** 0.2  
**Last updated:** July 2026
