# InstaAwards / SDF — Week 4 close

**Goal:** Close the acceleration month with **evidence of execution** (demo + metrics + pilot status), not new features. Aligns with SDF expectations: testnet reliability, design-partner learning, honest mainnet path.

**Prerequisites:** Week 3 engineering ([`week-03-changelog-and-architecture.md`](./week-03-changelog-and-architecture.md)), pilot framing ([`instaawards-week3.md`](./instaawards-week3.md)), demo script ([`docs/demo/E2E_TESTNET.md`](../demo/E2E_TESTNET.md)).

**Sprint changelog (engineering):** [`week-04-changelog-and-architecture.md`](./week-04-changelog-and-architecture.md)  
**Sprint checklist:** [`week-04-plan-and-checklist.md`](./week-04-plan-and-checklist.md)

---

## Definition of done (Week 4 / InstaAwards)

| # | Deliverable | Done when |
|---|-------------|-----------|
| 1 | **E2E demo** | Recording **or** live walkthrough using `E2E_TESTNET.md`; light theme on all steps |
| 2 | **Pilot status** | 1 design partner: **completed** full cycle **or** written retro with blockers + next date |
| 3 | **Metrics snapshot** | SQL below run once; numbers pasted in this doc or weekly note |
| 4 | **Reviewer pack** | README + ENDPOINTS + changelog Week 3–4 linked; no secrets in git |
| 5 | **Mainnet honesty** | Checklist in § Mainnet — items marked ☐/☑ with target date (no fake “live mainnet”) |
| 6 | **Stakeholder narrative** | 3 bullets: what shipped, what was learned, what is blocked for mainnet |

---

## 1. E2E demo (8–12 min)

**Script:** [`docs/demo/E2E_TESTNET.md`](../demo/E2E_TESTNET.md)

| Step | Show |
|------|------|
| Landing | Stats, light theme, wallet connect |
| Client | OAuth → create task |
| Freelancer | Apply + wallet verify |
| Escrow | Select proposal → fund (sign) |
| Release | Supervise → approve → explorer tx |
| Close | “Non-custodial; 3% platform fee on client; testnet today, mainnet checklist next” |

**Recording checklist**

- [ ] 1080p, wallet visible when signing
- [ ] Narrate testnet explicitly
- [ ] End on Stellar Expert testnet link
- [ ] Upload link noted below: _paste URL_

---

## 2. Design-partner pilot (close or document)

From Week 3 — finish **one** real task on testnet or document why not.

| Step | Status | Notes |
|------|--------|-------|
| Partner onboarded (OAuth + wallet) | ☐ | |
| Task posted | ☐ | |
| Proposal + select + escrow funded | ☐ | |
| Delivery + USDC release | ☐ | |
| Retro (blockers, NPS, repeat intent) | ☐ | |

**Retro template (short)**

- What broke (product / wallet / Trustless Work / UX)?
- Time from post → paid?
- Would they run a second task? Y/N + why?

---

## 3. Metrics snapshot (weekly)

Run against production MySQL (or admin export). Paste results with date.

```sql
-- Tasks posted (last 7 days)
SELECT COUNT(*) AS posted_7d FROM tasks
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Tasks completed (escrow released)
SELECT COUNT(*) AS completed FROM tasks
WHERE status = 'completed' AND escrow_status = 'completed';

-- Paid volume USDC (completed)
SELECT COALESCE(SUM(CAST(price AS DECIMAL(18,2))), 0) AS volume_usdc
FROM tasks
WHERE status = 'completed' AND escrow_status = 'completed';
```

**Funnel (manual counts OK for Week 4)**

`posted → proposal → funded → in_progress → completed → paid`

| Stage | Count (7d / all-time) |
|-------|------------------------|
| Posted | |
| With ≥1 proposal | |
| Escrow funded | |
| Completed / paid | |

**Snapshot date:** ___________

---

## 4. Mainnet readiness (honest checklist)

Do **not** claim mainnet in forms until row “Smoke $1 USDC” is ☑.

| Item | Location | Status | Target date |
|------|----------|--------|-------------|
| `WalletNetwork.MAINNET` | `arcusx/src/hooks/useWallet.ts` | ☐ | |
| `VITE_STELLAR_NETWORK=mainnet` | `arcusx/.env` (server) | ☐ | |
| `VITE_TRUSTLESS_WORK_BASE_URL=mainnet` | `arcusx/.env` | ☐ | |
| USDC issuer (mainnet G…) | `config/usdc.ts` | ☐ | |
| Platform/admin wallets | `trustlessWork.ts` | ☐ | |
| Secrets via `SetEnv` / host env | `backend_externo/.htaccess` | ☐ | |
| Smoke: one small USDC escrow E2E | Manual | ☐ | |

---

## 5. Stakeholder narrative (copy-paste draft)

**Shipped (testnet):**

- JWT on critical writes + Bearer on task/escrow UI.
- Reviewer docs + E2E script; light theme on auth, dashboard, and money-path screens.
- Referrals + Supabase edge (ops on server `SetEnv`).

**Learned:**

- _e.g. escrow UX / wallet friction / partner segment fit_

**Blocked for mainnet:**

- _e.g. TW mainnet keys, legal entity, $1 smoke, issuer trustlines_

---

## 6. Week 4 engineering (tie-in, no sprawl)

Pick **only** what blocks demo or pilot; defer the rest.

| Priority | Item | Owner |
|----------|------|-------|
| P0 | Record or schedule live E2E | Bruno |
| P0 | Pilot retro or scheduled session | Bruno |
| P1 | Bugs from Week 2 testing list | ☑ repo (`week-04-technical-close.md`) |
| P1 | Responsive smoke 320px on dashboard + proposals | Eng |
| P2 | i18n / console cleanup per `week-04-plan` | Eng |
| P3 | Full PHP `arcusx_json_error` migration | Backlog |

---

## Plan to finiquitar (ordered)

1. **Today:** Run E2E once on testnet following script; note any red item in retro table.
2. **48h:** Record demo **or** book live slot with SDF/reviewer; paste link in §1.
3. **This week:** Execute or schedule pilot step; fill metrics snapshot.
4. **Before reporting:** Update mainnet table with real dates; ship frontend `npm run build` + PHP deploy (keep server `.htaccess` secrets).
5. **Close:** Mark [`week-04-plan-and-checklist.md`](./week-04-plan-and-checklist.md) items; link this doc from README / panel talking points.

---

## Links

| Resource | Path |
|----------|------|
| Week 3 changelog | [`week-03-changelog-and-architecture.md`](./week-03-changelog-and-architecture.md) |
| Week 4 changelog | [`week-04-changelog-and-architecture.md`](./week-04-changelog-and-architecture.md) |
| Week 3 InstaAwards | [`instaawards-week3.md`](./instaawards-week3.md) |
| Month plan (reviewer) | [`PLAN_MES1_REVISORES.md`](../../PLAN_MES1_REVISORES.md) |
| Panel notes | [`arcusx/docs/PANEL_CODIGO_ALEBRIJE_STELLAR_HOUSE.md`](../../arcusx/docs/PANEL_CODIGO_ALEBRIJE_STELLAR_HOUSE.md) |

---

*Week 4 InstaAwards close — 2026-05-28*
