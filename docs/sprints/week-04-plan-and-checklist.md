# Week 4 — Plan & checklist (InstaAwards close)

**Target close:** 2026-05-28  
**Deliverables:** [`instaawards-week4.md`](./instaawards-week4.md) · Engineering alignment with [`PLAN_MES1_REVISORES.md`](../../PLAN_MES1_REVISORES.md) § Week 4

**Builds on:** Week 3 closed in repo ([`week-03-changelog-and-architecture.md`](./week-03-changelog-and-architecture.md)); light-theme follow-up 2026-05-28.

---

## Sprint goal

Finish the **reviewer / SDF month**: demo evidence, pilot outcome, metrics snapshot, honest mainnet checklist — plus **only** engineering fixes that block those outcomes.

---

## Checklist

| # | Area | Item | Done |
|---|------|------|------|
| 1 | **Demo** | E2E recorded or live per `docs/demo/E2E_TESTNET.md` | ☐ |
| 2 | **Pilot** | Design partner: full cycle **or** retro + next date in `instaawards-week4.md` | ☐ |
| 3 | **Metrics** | SQL snapshot pasted in `instaawards-week4.md` | ☐ |
| 4 | **Docs** | `instaawards-week4.md` filled; README links Week 4 | ☐ |
| 5 | **Deploy** | `npm run build` + PHP upload; server `.htaccess` `SetEnv` preserved | ☐ |
| 6 | **Light theme** | Smoke routes in week-03 changelog § Verification (light) | ☐ |
| 7 | **Bugs** | Week 2 critical-flow issues resolved or documented WONTFIX | ☐ |
| 8 | **i18n** | ProtectedRoute, SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile → `t()` where still hardcoded (best effort) | ☐ |
| 9 | **Console** | No `console.log` in production paths (ProposalReview, escrow service, dashboard) | ☐ |
| 10 | **Responsive** | 320px / 768px: dashboard + proposals — no horizontal overflow | ☐ |
| 11 | **Mainnet** | Checklist dated in `instaawards-week4.md` — no false claims | ☐ |

---

## In scope (Week 4)

- Demo + pilot + metrics (InstaAwards).
- Bug fixes from prior testing.
- Light theme **verification** (already implemented — confirm on device).
- Reviewer pack links in README.

## Out of scope (next cycle)

- Mainnet flip without smoke test.
- New product lines (agentic payments, native Soroban escrow in prod).
- Migrating every PHP endpoint to `arcusx_json_error`.
- Full i18n of admin panel.

---

## Deploy reminder

| Item | Action |
|------|--------|
| PHP | Upload changed `backend_externo/` files only if touched |
| Frontend | `cd arcusx && npm run build` → `dist/` |
| Server `.htaccess` | Keep production `SetEnv` — do not overwrite with template |
| Git | No `arcusx/.env` or secrets in commits |

---

## Definition of done

Week 4 is **closed** when:

1. At least one of: **demo link** or **scheduled live demo** is documented.
2. Pilot table in `instaawards-week4.md` is complete or retro explains blockers.
3. Metrics snapshot dated.
4. `npm run build` passes.
5. This checklist rows 1, 4, 5, 6, 11 are ☑.

---

*Week 4 — InstaAwards / reviewer month finisher.*
