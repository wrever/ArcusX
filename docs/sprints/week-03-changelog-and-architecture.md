# ArcusX — Week 03 changelog & architecture

**Sprint:** Week 3 close (API polish, light theme, reviewer docs)  
**Committed scope:** (1) JWT-bound critical write routes + JSON helpers, (2) frontend Bearer on task/escrow flows, (3) light theme with readable contrast across auth, dashboard, and critical product flows, (4) Hero stats + reviewer documentation, (5) InstaAwards alignment (pilot checklist).

**Follow-up (2026-05-28):** Extended light-theme contrast pass — `light-theme-remaining.css`, `light-theme-contrast.css`, per-page overrides (ProposalReview escrow, ApplyTask wallet, Hero roadmap, blockchain status, etc.). See §3.1 below.

**Builds on Week 2:** CORS allowlist, `auth_bearer.php`, wallet in profile, referrals + `SetEnv` on **production server** (not in git).

**Operational checklist:** [`week-03-plan-and-checklist.md`](./week-03-plan-and-checklist.md)

---

## Executive summary

| Commitment | Repo status | Quick check |
|------------|-------------|-------------|
| API error contract (critical writes) | **Done** | `apply_task.php`, `create_task.php`, `select_proposal.php`, escrow/dispute/cancel paths use `arcusx_require_user_id()` |
| Frontend Bearer | **Done** | `grep config/axios arcusx/src` → Apply, Create, Proposal, Supervise, dashboard, privateOffers, cancelTask |
| Hero public stats | **Done** | `Hero.tsx` + `get_landing_market_stats.php`; README § Hero stats |
| Light theme | **Done** | Five-layer CSS in `main.tsx` + per-page overrides; smoke list in § Verification |
| Reviewer docs | **Done** | `docs/api/ENDPOINTS.md`, `docs/demo/E2E_TESTNET.md` |
| InstaAwards / mainnet prep | **Done (doc)** | `docs/sprints/instaawards-week3.md` |

---

## Changelog

### 1. API — critical routes + JSON helpers

**`backend_externo/auth_bearer.php`**

- `arcusx_json_success($extra, $httpCode)` — uniform 200 JSON with `success: true`.
- `arcusx_json_error($httpCode, $message, $error)` — uniform errors; **401** uses `error: invalid_or_missing_token` via `arcusx_require_user_id()`.

**JWT required + identity checks**

| Endpoint | Week 3 change |
|----------|----------------|
| `apply_task.php` | Rewrite: `arcusx_require_user_id()`; `applicantId` must match JWT (**403**); prepared statements; `arcusx_json_exit` on errors |
| `create_task.php` | JWT; body `user_id` must match token |
| `select_proposal.php` | `arcusx_require_user_id()` (task owner flow) |
| `complete_task.php` | `arcusx_require_user_id()` |
| `cancel_task.php` | `arcusx_require_user_id()` |
| `create_dispute.php` | `arcusx_require_user_id()` |
| `create_escrow.php` | `arcusx_require_user_id()` |
| `verify_wallet.php` / `register_wallet.php` | `arcusx_require_user_id()` (Week 2 base, Week 3 aligned) |

**Public stats (no JWT)**

| Endpoint | Week 3 change |
|----------|----------------|
| `get_landing_market_stats.php` | `arcusx_json_success` / `arcusx_json_error`; **GET** only |

**Nuances (honest scope):**

- ~30 routes still use `auth_bearer.php` from Week 2; not every `exit` in every PHP file was migrated to `arcusx_json_error` — only **critical write paths** listed above + landing stats.
- Interior validation in some files may still `echo json_encode` with the same `success` / `message` shape — acceptable for Week 3 close.

### 2. Frontend — Bearer via `config/axios`

**`arcusx/src/config/axios.ts`** attaches `Authorization: Bearer` from `localStorage.token`.

| Module | Notes |
|--------|--------|
| `ApplyTask.tsx` | apply + task details |
| `CreateTask.tsx` | create task + limits |
| `ProposalReview.tsx` | proposals, select, escrow create |
| `SuperviseTask.tsx` | complete, dispute |
| `dashboard.tsx` | tasks, earnings, accepted |
| `privateOffersService.ts` | private offers |
| `cancelTaskService.ts` | cancel + check allowed |

**Still plain `axios` / `fetch` (by design):** `Hero.tsx` (public), `authService.ts` (OAuth sync), `profileService.ts`, `ratingService.ts`, `disputeService.ts` (Bearer via manual headers or public reads).

### 3. Light theme

**CSS layers (import order in `main.tsx`)**

| File | Role |
|------|------|
| `css/light-theme-global.css` | Wallet navbar, language, filters, back buttons, pagination, shared tokens |
| `css/auth-surfaces-light.css` | Login, Register, Admin login/panel, support chat |
| `css/dashboard-light.css` | Dashboard cards, filters, tasks, settings (privacy, avatar, skills preview, notifications bell) |
| `css/light-theme-remaining.css` | Admin stats, disputes, escrow management, referrals, shared modals |
| `css/light-theme-contrast.css` | Primary/secondary buttons, tabs, OAuth, dispute surfaces; avoids white-on-white primaries |
| `css/ProtectedRoute.css` | Loading route without dark gradient |

**Per-page overrides (`[data-theme="light"]` in component CSS)**

| Area | Files / notes |
|------|----------------|
| Hero & preloader | `Hero.css` (roadmap, search loading), `Preloader.css` (spinner) |
| Proposals & escrow UI | `ProposalReview.css` — accept/reject, selection confirmation, `.escrow-process-*` (fund/release popup) |
| Apply & hire | `ApplyTask.css` (wallet paste), `FreelancerCard.css` (skills, hire CTA) |
| Supervise & blockchain | `SuperviseTask.css` (`.blockchain-status`, modal tokens) |
| Wallet & swap | `WalletConnectPopup.css` (download CTA text), `SwapCard.css` (switch) |
| Profile | `UserProfile.css` (preloader no longer forces `#0a0a0a` in light) |
| Dashboard actions | `dashboard.css` — `--on-accent` for gradient buttons; removed blanket “all SVG black” rule |

**Theme token**

- `themes.css`: `--on-accent: #ffffff` for text on green gradient buttons (dark and light).

**Root-cause fixes (contrast)**

- **Gradient buttons:** stopped using `--text-primary` (dark in light mode) on green gradients; use `--on-accent`.
- **Global `* { color: #000 }`:** removed from proposal confirmation blocks (broke “Aceptar propuesta”).
- **`.download-button`:** removed from “primary white text” list in `light-theme-contrast.css` (was invisible on white).
- **Inline `#fff` / `rgba(255,255,255,…)`:** replaced with CSS variables in critical TSX (SuperviseTask, ProposalReview, dispute/escrow popups, admin stats).
- **Wallet / filters / back / Popup / ConfirmDialog:** as in initial Week 3 close (see git history 2026-05-18).

### 3.1 Follow-up contrast pass (2026-05-28)

Shipped after reviewer UX feedback on light mode. Goal: no dark-theme leaks, readable CTAs, visible borders, correct icon color on every **money path** screen.

Deferred to Week 4 / backlog: full responsive audit (320–480px), every admin subsection, SwapPage edge cases, i18n/console cleanup per [`PLAN_MES1_REVISORES.md`](../../PLAN_MES1_REVISORES.md).

### 4. Documentation & InstaAwards

| Document | Purpose |
|----------|---------|
| [`docs/api/ENDPOINTS.md`](../api/ENDPOINTS.md) | Routes used by frontend; public vs JWT; stability labels |
| [`docs/demo/E2E_TESTNET.md`](../demo/E2E_TESTNET.md) | 8–12 min testnet demo script (optional recording) |
| [`docs/sprints/instaawards-week3.md`](./instaawards-week3.md) | Design-partner pilot, SQL metrics, mainnet checklist |
| [`README.md`](../../README.md) | Local dev, Hero stats source, links to reviewer docs |

---

## Architecture (Week 3 slice)

```mermaid
sequenceDiagram
  participant U as User browser
  participant AX as config/axios
  participant PHP as backend_externo
  participant TW as Trustless Work

  U->>AX: POST apply_task / create_task
  AX->>PHP: Bearer JWT
  PHP->>PHP: arcusx_require_user_id()
  alt applicantId or user_id mismatch
    PHP-->>U: 403 JSON success false
  else OK
    PHP-->>U: 200 JSON
  end
  U->>TW: fund / release escrow (wallet signs)
  U->>PHP: select_proposal / complete_task
```

**Theme:** `data-theme="light|dark"` on `<html>` (`ThemeContext`); layered CSS overrides — no runtime CSS-in-JS theme engine.

---

## Secrets & production `.htaccess` (important)

Week 3 does **not** remove server configuration.

| Location | What |
|----------|------|
| **Production server** | `backend_externo/.htaccess` with **`SetEnv`** (`ARCUSX_JWT_SECRET`, `ARCUSX_DB_PASSWORD`, Supabase vars, referral-related config) — **required** for PHP + OAuth + referrals on shared hosting |
| **Git** | `backend_externo/.env.example` only — **no real secrets** |
| **Local** | Copy server `SetEnv` or use host panel; do not commit real `.htaccess` if it contains secrets |

Referrals (Week 2+) need the same `ARCUSX_JWT_SECRET` on PHP origin and Supabase Edge Secrets — unchanged in Week 3.

---

## Verification matrix

| # | Definition of done | Where to verify |
|---|-------------------|-----------------|
| 1 | Apply with JWT | POST `apply_task.php` with Bearer; wrong `applicantId` → **403** |
| 2 | Create with JWT | POST `create_task.php`; `user_id` ≠ JWT → **403** |
| 3 | Bearer on UI flows | Network tab: `Authorization` on apply/create/proposal/supervise |
| 4 | Light theme readable | Smoke routes below (light mode) |
| 5 | Hero stats | `/` shows numbers; fallback `get_landing_market_stats.php` |
| 6 | Build | `cd arcusx && npm run build` |

### Manual smoke (pre-delivery)

| Route / surface | Expected (light) |
|-----------------|-------------------|
| `/` Hero | Roadmap legible; stats readable; wallet connect |
| Dashboard + `/dashboard/settings` | Wallet, filters, privacy toggle, avatar, skills preview, notification bell |
| `/profile/:id` | Public profile; “Ver perfil” / edit buttons visible |
| `/apply-task/:id` | “Usar wallet conectada” / paste CTA readable |
| `/proposals/:id` | Accept/reject hover; escrow process popup (fund/release) |
| Supervise task | Blockchain status card; modals |
| Freelancers list / card | Skill chips; “Encargar” / hire button |
| Wallet popup / Swap | Download wallet text; swap switch |
| Light + dark toggle | No regressions on dashboard header |
| Select proposal + cancel | Bearer OK; escrow flow starts |
| Prod secrets | App + referrals with server `.htaccess` `SetEnv` (not from git) |

---

## Production deployment checklist

1. Deploy **PHP** from `backend_externo/` (touched endpoints + `auth_bearer.php`).
2. **Keep** production `.htaccess` with `SetEnv` on the server — do not replace with repo copy if repo has placeholders only.
3. Confirm Edge **`ARCUSX_JWT_SECRET`** still matches PHP (referrals admin).
4. Frontend: `cd arcusx && npm run build` → publish `dist/`.
5. Hard refresh / purge CDN for new CSS bundles (`light-theme-*`, `dashboard-light`, `auth-surfaces-light`, updated page CSS).

**Do not commit:** `arcusx/.env`, server `.htaccess` with real `SetEnv` values.

---

## Out of scope (Week 4 / InstaAwards close)

- Migrating every PHP `exit` to `arcusx_json_error` (read-only GETs, admin bulk actions).
- Migrating all services to `config/axios` (profile, ratings, disputes use `fetch` with manual Bearer).
- E2E **video** recording (script ready — Week 4 deliverable).
- Live design-partner pilot execution (tracked in [`instaawards-week4.md`](./instaawards-week4.md)).
- Responsive pass 320–768px, i18n gaps, `console.*` cleanup — [`week-04-plan-and-checklist.md`](./week-04-plan-and-checklist.md).

---

## Related versioning

- [`CHANGELOG.md`](../../CHANGELOG.md) — **2026-05-18** (Week 3 core) + **2026-05-28** (light theme follow-up).
- InstaAwards: [`instaawards-week3.md`](./instaawards-week3.md) → [`instaawards-week4.md`](./instaawards-week4.md).

---

*Sprint close artifact. Core close: 2026-05-18. Light theme follow-up documented: 2026-05-28.*
