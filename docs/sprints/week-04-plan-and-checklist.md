# Week 4 — Plan & checklist (InstaAwards close)

**Target close:** 2026-05-28  
**Deliverables:** [`week-04-changelog-and-architecture.md`](./week-04-changelog-and-architecture.md) · [`instaawards-week4.md`](./instaawards-week4.md) · [`week-04-technical-close.md`](./week-04-technical-close.md) · Engineering alignment with [`PLAN_MES1_REVISORES.md`](../../PLAN_MES1_REVISORES.md) § Week 4

**Builds on:** Week 3 closed in repo ([`week-03-changelog-and-architecture.md`](./week-03-changelog-and-architecture.md)); light-theme follow-up 2026-05-28.

---

## Sprint goal

Finish the **reviewer / SDF month**: demo evidence, pilot outcome, metrics snapshot, honest mainnet checklist — plus **only** engineering fixes that block those outcomes.

---

## Checklist

| # | Area | Item | Done |
|---|------|------|------|
| 1 | **Demo** | E2E recorded or live per `docs/demo/E2E_TESTNET.md` | ☐ ops |
| 2 | **Pilot** | Design partner: full cycle **or** retro + next date in `instaawards-week4.md` | ☐ ops |
| 3 | **Metrics** | SQL snapshot pasted in `instaawards-week4.md` | ☐ ops |
| 4 | **Docs** | `instaawards-week4.md` filled; README links Week 4 | ☐ ops |
| 5 | **Deploy** | `npm run build` + PHP upload; server `.htaccess` `SetEnv` preserved | ☐ ops |
| 6 | **Light theme** | 8 archivos + gaps en `week-04-light-theme-gaps.md` | ☑ repo |
| 7 | **Bugs** | Week 2 utilities; EvidenceUpload **habilitado** (Tranche 2); check_disputes | ☑ repo |
| 8 | **i18n** | 5 componentes — ver `week-04-technical-close.md` | ☑ repo |
| 9 | **Console** | devLog/devWarn/devError en 3 archivos + logger | ☑ repo |
| 10 | **Responsive** | `responsive-critical.css` + chart 480px | ☑ repo |
| 11 | **Mainnet** | Checklist dated in `instaawards-week4.md` — no false claims | ☐ ops |

---

## In scope (Week 4)

- Demo + pilot + metrics (InstaAwards).
- Bug fixes from prior testing.
- Light theme **verification** (already implemented — confirm on device).
- Reviewer pack links in README.

## Tranche 2 (2026-05-28)

- **Cerrado ingeniería:** [`TRANCHE2_CLOSURE.md`](./TRANCHE2_CLOSURE.md)
- **Próximo backlog:** [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md)
- **E2E cierre:** [`docs/demo/E2E_CHECKLIST.md`](../demo/E2E_CHECKLIST.md)

## Out of scope (next cycle)

- Mainnet flip without smoke test.
- New product lines (agentic payments, native Soroban escrow in prod).
- Migrating every PHP endpoint to `arcusx_json_error`.
- Full i18n of admin panel.
- B2B org/KYB (→ POST_TRANCHE2 `Q3-A`).

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

### Engineering (repo) — ☑ 2026-05-28

Rows **6–10** in the table above (light theme verified, bugs, i18n, console, responsive). Changelog: [`week-04-changelog-and-architecture.md`](./week-04-changelog-and-architecture.md).

### InstaAwards sprint (ops + docs) — open until:

1. At least one of: **demo link** or **scheduled live demo** in `instaawards-week4.md` §1.
2. Pilot table §2 complete or retro with blockers + next date.
3. Metrics snapshot dated (§3).
4. `npm run build` passes on release branch.
5. Checklist rows **1, 4, 5, 11** are ☑.

---

*Week 4 — InstaAwards / reviewer month finisher.*
