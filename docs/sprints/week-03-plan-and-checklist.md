# Week 3 — Plan & checklist (CLOSED)

**Closed:** 2026-05-18  
**Deliverable:** [`week-03-changelog-and-architecture.md`](./week-03-changelog-and-architecture.md)

---

## Sprint goal

API polish on **critical** routes, **Bearer** on task/escrow UI, **light theme** on auth + dashboard, **Hero stats** documented, **reviewer package** (ENDPOINTS + E2E script), **InstaAwards** alignment doc.

---

## Checklist — all done

| Area | Done |
|------|------|
| API: apply, create, select, complete, cancel, dispute, escrow, wallet, landing stats | Yes |
| `arcusx_json_success` / `arcusx_json_error` helpers | Yes |
| Frontend `config/axios` on critical flows + cancelTask | Yes |
| Light theme CSS + contrast fixes | Yes |
| `docs/api/ENDPOINTS.md`, `docs/demo/E2E_TESTNET.md` | Yes |
| `docs/sprints/instaawards-week3.md` | Yes |
| README: local dev + Hero stats | Yes |
| `npm run build` | Yes |

**Optional (not blocking close):** recorded demo video; live design-partner pilot.

---

## Deploy reminder

| Item | Action |
|------|--------|
| PHP | Upload changed files under `backend_externo/` |
| Frontend | `npm run build` → upload `arcusx/dist/` |
| Server `.htaccess` | **Leave production `SetEnv` in place** (referrals, JWT, DB) — do not overwrite with empty template |
| Git commit | Exclude `arcusx/.env` and server `.htaccess` with secrets |

---

*Week 3 closed.*
