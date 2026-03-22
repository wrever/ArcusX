# Delivery Plan — First Month (Technical Review)

**Document for technical reviewers.** It describes the scope of work for the first month post-funding: issues addressed, weekly deliverables, and verification criteria. The budget (5,000 USDC) is allocated to development operating costs.

---

## 1. Executive Summary


| Area              | Scope for the month                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**      | JWT enforcement in `update_user.php`; credentials in environment variables; prepared statements in `update_user.php` and `register.php`; utility endpoints disabled or protected in production.                             |
| **API / Backend** | Unified CORS; centralized JWT; valid JSON responses and correct HTTP status codes. Wallet flow: integration or status documented in README. Hero public stats: connection to `get_public_stats.php` or documented decision. |
| **Frontend**      | Light theme applied to a fixed list of files; responsiveness at 320–480px and 768px; i18n in 5 components; console output restricted to development in 3 files; cleanup of unused CSS and backups.                          |
| **Wallets**       | At least one additional Stellar wallet besides Freighter (via existing Stellar Wallets Kit): connect, sign, receive payments; copy and UI updated accordingly.                                                              |
| **Documentation** | README, endpoint list and status, instructions to run backend and frontend locally. Demo (recording or script) for the flow: create task → apply → escrow → complete → payment.                                             |


---

## 2. Technical Issues Addressed (Reference for Verification)

### 2.1 Security


| Issue                          | Location                                                                           | Committed solution                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| No JWT validation on user edit | `update_user.php`                                                                  | Validate JWT and ensure token `user_id` matches the edited `id`; return 403 otherwise.                       |
| Credentials in code            | `config.php`, `login.php`                                                          | Move DB password and JWT secret to environment variables; document required variables in README (no values). |
| SQL injection risk             | `update_user.php`, `register.php`                                                  | Replace string concatenation with prepared statements for all queries using request data.                    |
| Utility endpoints exposed      | `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php` | Disable or protect in production (IP, secret, admin role, or 404).                                           |


### 2.2 Functionality and API


| Issue                                      | Location / context                                        | Committed solution                                                                                         |
| ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 404 from EvidenceUpload / missing endpoint | EvidenceUpload component, `upload_milestone_evidence.php` | Hide or disable the component. Do not implement the endpoint this month.                                   |
| Hero stats using mocks                     | Hero, `get_public_stats.php`                              | Connect Hero to `get_public_stats.php` or document in README why mocks are used and when that will change. |
| Wallet flow not called from frontend       | `register_wallet.php`, `verify_wallet.php`                | Integrate calls into profile/wallet flow or document current state in README.                              |
| Only Freighter supported                   | UI, error messages, FAQ                                   | Expose at least one additional Stellar wallet (e.g. Albedo) via Stellar Wallets Kit; update copy and UI.   |
| Inconsistent CORS                          | `update_user.php` uses `*`; others use allowlist          | Unify policy: same allowlist for all; no `*` in update_user.                                               |
| JWT secret in multiple files               | `login.php`, `sync_supabase_user.php`, etc.               | Centralize secret in a single place (config or env); all sign/verify logic reads from there.               |
| 500 responses or empty body                | Various endpoints                                         | Ensure valid JSON and correct HTTP status codes (401, 403, 404, 422 as appropriate).                       |


### 2.3 Light Theme

**Global variables:** `arcusx/src/css/themes.css`. In `:root[data-theme="light"]`, `--primary-green` is not defined; several components use `var(--primary-green, #10dd88)`, and in light mode the fallback breaks the palette. Action: define `--primary-green` for light or align with `--primary-blue`.

**Files with no light overrides (Week 3):** Login.css, Register.css, AdminLogin.css, AdminPanel.css, SupportChatButton.css, ProtectedRoute (inline styles in TSX). Action: add `:root[data-theme="light"]` blocks or classes/vars that respect `data-theme`.

**Files with incomplete light overrides:**


| File                                                                                                                                     | Elements to fix or complete                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Navbar.css                                                                                                                               | `.navbar.scrolled` — already has light override (`var(--bg-glass)`).                                                        |
| dashboard.css                                                                                                                            | `.stat-card`, `.user-avatar-placeholder`, and cards/borders using hardcoded colors.                                         |
| Popup.css, ConfirmDialog.css                                                                                                             | Complete overrides for .popup-content, titles, buttons, message, actions.                                                   |
| dashboard.tsx, TaskManagement.tsx                                                                                                        | Replace inline styles (`#fff`, `rgba(255,255,255,...)`, `#ef4444`) with classes using `var(--text-primary)`, `var(--bg-*)`. |
| Hero.css, EditProfile.css, SuperviseTask.css, ProposalReview.css, UserProfile.css, ApplyTask.css, CreateTask.css, WalletConnectPopup.css | Complete light overrides where missing; use CSS variables instead of `#ffffff`, `#07233c`, etc.                             |


### 2.4 Mobile Responsiveness


| Area                          | Breakpoints      | Correction criteria                                                                                                                                   |
| ----------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                     | 320–480px, 768px | Sidebar/drawer, tables, cards with no horizontal overflow; touch targets ≥44px; transactions table with horizontal scroll or stacked layout at 320px. |
| Navbar                        | 768px, 480px     | Open menu must not clip buttons (Logout/Login); logo must not collapse.                                                                               |
| Hero                          | 360–480px, 768px | Stats, CTA, feature cards with no overlap; readable text.                                                                                             |
| SuperviseTask, ProposalReview | 768px            | Single-column grid; forms and buttons remain in view.                                                                                                 |
| CreateTask, ApplyTask         | 768px, 480px     | No horizontal overflow; inputs with adequate touch size.                                                                                              |
| SwapPage                      | Mobile           | Inputs and swap button within viewport; prices readable.                                                                                              |


### 2.5 Frontend and Maintenance


| Area    | Detail                                                                        | Deliverable                                                       |
| ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| i18n    | ProtectedRoute, SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile | Translations via `t()` and `translations.ts` in all 5 components. |
| Console | ProposalReview, trustlessWorkEscrowService, dashboard                         | `console.`* restricted to development environment.                |
| Cleanup | Unused CSS, .bak files                                                        | Remove or archive; exceptions listed in README with rationale.    |


---

## 3. Weekly Deliverables (Verifiable)

### Week 1 | Security and EvidenceUpload


| #   | Deliverable                                                                                  | Suggested verification                                                             |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `update_user.php`: JWT validation and check that token `user_id` equals edited `id`          | POST without JWT or with another user’s `id` → 403.                                |
| 2   | `update_user.php` and `register.php`: prepared statements for all queries using request data | Code review: no input concatenation into SQL.                                      |
| 3   | EvidenceUpload hidden or disabled                                                            | No 404 in used flows; component not exposed.                                       |
| 4   | Credentials in environment variables; `config.php` and `login.php` read from env             | README documents required variables (no values); no secret/DB credentials in repo. |


### Week 2 | Endpoints, CORS, JWT, Wallet, Testing


| #   | Deliverable                                           | Suggested verification                                                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Utility endpoints disabled or protected in production | `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php`: 404 or auth in prod. |
| 2   | CORS unified across all endpoints                     | Same allowlist; no `Access-Control-Allow-Origin: *` on update_user.                                      |
| 3   | JWT centralized                                       | Single source (config/env) for secret; login and sync_supabase_user (and any others) use it.             |
| 4   | Wallet flow                                           | register_wallet/verify_wallet calls integrated in profile/wallet flow or status documented in README.    |
| 5   | Critical-flow testing                                 | Register, login, create task, apply, escrow, complete, dispute; issues logged for Week 4.                |


### Week 3 | API, Stats, Additional Wallet, Documentation, Light Theme, Demo


| #   | Deliverable                                                     | Suggested verification                                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | API responses                                                   | Endpoints that returned 500 or empty body: valid JSON and 401/403/404/422 as appropriate.                                                                                                                                                                                                                                              |
| 2   | Hero public stats                                               | Hero wired to `get_public_stats.php` or README documents decision on mocks.                                                                                                                                                                                                                                                            |
| 3   | Additional Stellar wallet (e.g. Albedo) via Stellar Wallets Kit | Option in UI; connect, sign, receive payments; copy/UI updated (not Freighter-only).                                                                                                                                                                                                                                                   |
| 4   | Documentation                                                   | README updated; list of endpoints used by frontend and their status (stable/in review); how to run backend and frontend locally.                                                                                                                                                                                                       |
| 5   | Light theme (Week 3)                                            | themes.css `--primary-green` for light; Login, Register, AdminLogin, AdminPanel, SupportChatButton, ProtectedRoute with light overrides; dashboard.css (.stat-card, .user-avatar-placeholder); Popup.css and ConfirmDialog.css complete; dashboard.tsx and TaskManagement.tsx without inline color/background styles in visible areas. |
| 6   | Demo                                                            | Recording or script: create task → apply → escrow → complete → payment.                                                                                                                                                                                                                                                                |


### Week 4 | Bug Fixes, i18n, Console, Cleanup, Responsiveness, Light Theme, Reviewer Pack


| #   | Deliverable          | Suggested verification                                                                                                                                                   |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Testing bugs         | Issues from Week 2 resolved; critical flows verified on Testnet.                                                                                                         |
| 2   | i18n                 | ProtectedRoute, SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile using `t()`.                                                                               |
| 3   | Console              | ProposalReview, trustlessWorkEscrowService, dashboard: `console.*` only in development.                                                                                  |
| 4   | Cleanup              | Unused CSS and .bak files removed or archived; exceptions in README.                                                                                                     |
| 5   | Responsiveness       | 320–480px and 768px: no horizontal overflow, touch targets ≥44px, prices readable (zones listed in §2.4).                                                                |
| 6   | Light theme (Week 4) | Hero, EditProfile, SuperviseTask, ProposalReview, UserProfile, ApplyTask, CreateTask, WalletConnectPopup: consistent light overrides or explicit ISSUE for pending work. |
| 7   | Reviewer pack        | Repo up to date; README with setup; endpoint list/status; link to demo; checklist “Fixed this month” with concrete items.                                                |


---

## 4. Success Criteria for the Month (Reviewer Checklist)

- **Security:** update_user protected with JWT; credentials out of codebase; prepared statements in update_user and register; utility endpoints not reachable in production.
- **Functionality:** No 404 in used flows (EvidenceUpload addressed by hiding); documented decision on public stats; wallet flow integrated or documented; at least one Stellar wallet in addition to Freighter (connect, sign, receive payments) and copy/UI updated.
- **API:** CORS unified; JWT centralized; valid JSON and correct HTTP status codes on critical endpoints.
- **Documentation and demo:** README and endpoint list updated; demo recorded or script ready; reviewer pack with concrete list of fixes.
- **Light theme and mobile:** Light theme with no broken areas (Navbar, ProtectedRoute, Login, Dashboard, Hero, and files in §2.3); responsiveness with no horizontal overflow, touch targets ≥44px, and correct readability at 320–480px and 768px.

---

## 5. Quick Reference | Light Theme (Files in Scope)

**Week 3:** themes.css, Login.css, Register.css, AdminLogin.css, AdminPanel.css, SupportChatButton.css, ProtectedRoute (TSX), dashboard.css (.stat-card, .user-avatar-placeholder), Popup.css, ConfirmDialog.css, dashboard.tsx, TaskManagement.tsx.

**Week 4:** Hero.css, EditProfile.css, SuperviseTask.css, ProposalReview.css, UserProfile.css, ApplyTask.css, CreateTask.css, WalletConnectPopup.css.

**Out of scope this month:** Any other file or component not listed above; to be documented as pending for the next cycle.