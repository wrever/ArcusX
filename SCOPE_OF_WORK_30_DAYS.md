# 4. Scope of Work (30-Day Deliverables)

*This scope must be achievable within 30 calendar days. If the work feels larger, it should be reduced or split into more achievable phases.*

---

## 4.1 In-Scope Deliverables

| Deliverable | Description (What will be built or produced?) | Why this matters |
| ----------- | --------------------------------------------- | ---------------- |
| **Deliverable 1** | **Auth and data-layer hardening.** Implement JWT checks on `update_user.php` so the token’s user matches the profile being edited; move database and JWT secrets into environment variables; replace raw SQL with prepared statements in `update_user.php` and `register.php`; and restrict or remove in production the utility scripts `create_test_dispute.php`, `reset_human_id_action_id.php`, and `reset_user_limits.php`. Resolve the EvidenceUpload 404 by hiding or disabling that component (no new upload endpoint this month). | Prevents unauthorized profile changes, secret leakage, and SQL injection; avoids dev/admin tools being exposed in production; removes a broken UI path that currently triggers 404s. |
| **Deliverable 2** | **Backend alignment and clarity.** Apply a single CORS allowlist across all endpoints (no wildcard); use one shared source for the JWT secret (env or config); and fix critical endpoints so they always return valid JSON with appropriate status codes (401, 403, 404, 422) instead of 500 or empty bodies. Either integrate `register_wallet.php` / `verify_wallet.php` into the profile/wallet flow or document the current behavior and any limitations in the README. | Reduces cross-origin and auth bugs, gives the frontend predictable error handling, and centralizes secret management; reviewers and future work get a clear picture of wallet verification. |
| **Deliverable 3** *(optional)* | **UX and wallet expansion.** Deliver light theme for the agreed file set (including `--primary-green` for light mode), responsive behavior at 320–480px and 768px for the listed pages, i18n in five components, dev-only `console.*` in three files, and removal of unused CSS and `.bak` files. Add at least one extra Stellar wallet (e.g. Albedo) via Stellar Wallets Kit (connect, sign, receive payment) and update UI copy accordingly. Either connect the Hero to `get_public_stats.php` or document in the README why mocks are used and when that will change. | Improves usability in light mode and on mobile, keeps logging out of production, and gives users a second wallet option; clear stats or documented rationale supports demos and SCF evaluation. |

---

## Out-of-Scope (Explicitly Not Included)

*Items that might be assumed but are not part of this Instaward.*

- **Backend rework:** Full migration to another stack (e.g. Node/TS/Postgres), performance re-architecture, or a formal/audit-grade security review.
- **New product features:** Badges, referrals, subscriptions, multi-milestone escrow, or any feature beyond the listed readiness work.
- **Broader UI/theme work:** Any file or component not in the agreed list; such work may be tracked as issues for a later phase.
