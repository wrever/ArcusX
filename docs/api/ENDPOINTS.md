# ArcusX — Frontend API endpoints

Base URL: `VITE_API_URL` or default `https://arcusx.pro/api` (see `arcusx/src/config/database.ts`).

**Auth:** User routes expect `Authorization: Bearer <JWT>` from `sync_supabase_user.php` unless marked **Public**.

**Response contract (Week 3+):** Critical write routes use `arcusx_json_exit` / `arcusx_require_user_id()` — JSON body with `success` boolean; **401** includes `error: invalid_or_missing_token`.

| Status | Meaning |
|--------|---------|
| 401 | Missing/invalid JWT |
| 403 | JWT valid but identity/resource mismatch |
| 400 | Validation error |
| 405 | Wrong HTTP method |
| 410 | Deprecated (`confirm_escrow_signature.php`) |

---

## Public (no JWT)

| Endpoint | Method | Used by | Notes |
|----------|--------|---------|-------|
| `/auth/get_landing_market_stats.php` | GET | `Hero.tsx` | `open_tasks`, `total_users`, `total_volume_usdc` |
| `/auth/get_platform_fee.php` | GET | `platformFeeService.ts` | Commission rate |
| `/auth/get_tasks.php` | GET | `Hero.tsx`, `dashboard.tsx` | Marketplace listing |
| `/auth/get_freelancers.php` | GET | `freelancerService.ts` | Directory |
| `/auth/sync_supabase_user.php` | POST | `authService.ts` | OAuth → app JWT |
| `/auth/admin_login.php` | POST | `adminService.ts` | Admin JWT (separate flow) |

**Hero stats fallback:** If `VITE_SUPABASE_URL` is set, `Hero.tsx` prefers Supabase RPCs; otherwise MySQL via `get_landing_market_stats.php`.

---

## Auth — tasks & proposals

| Endpoint | Method | Used by | Week 3 |
|----------|--------|---------|--------|
| `/auth/create_task.php` | POST | `CreateTask.tsx` | JWT + `user_id` match |
| `/auth/apply_task.php` | POST | `ApplyTask.tsx` | JWT + `applicantId` match |
| `/auth/select_proposal.php` | POST | `ProposalReview.tsx` | JWT (task owner) |
| `/auth/get_task_details.php` | GET | Apply, Proposal, Supervise | Bearer |
| `/auth/get_task_proposals.php` | GET | `ProposalReview.tsx` | Bearer |
| `/auth/get_tasks.php` | GET | Dashboard | Bearer optional filters |
| `/auth/get_user_tasks.php` | GET | Dashboard | Bearer |
| `/auth/get_accepted_tasks.php` | GET | Dashboard | Bearer |
| `/auth/get_completed_tasks_count.php` | GET | Dashboard | Bearer |
| `/auth/task_stats.php` | GET | `CreateTask.tsx` | Limits/cooldown |
| `/auth/check_user_limits.php` | GET | Limits | Bearer |
| `/auth/cancel_task.php` | POST | `cancelTaskService.ts` | JWT |
| `/auth/check_cancellation_allowed.php` | GET | `cancelTaskService.ts` | JWT |
| `/auth/delete_scheduled_tasks.php` | GET | Cron hook | Token query param |

---

## Auth — escrow & completion

| Endpoint | Method | Used by | Week 3 |
|----------|--------|---------|--------|
| `/auth/create_escrow.php` | POST | `ProposalReview.tsx` | JWT |
| `/auth/complete_task.php` | POST | `SuperviseTask.tsx` | JWT |
| `/auth/mark_work_started.php` | POST | Supervise | Bearer |
| `/auth/get_escrow_status.php` | GET | Escrow UI | Bearer |
| `/auth/save_escrow_secret.php` | POST | Legacy paths | Bearer |
| `/auth/get_escrow_secret.php` | GET | Legacy | Bearer |
| `/auth/confirm_escrow_signature.php` | * | — | **410 Gone** |

Primary escrow UX: **Trustless Work** SDK in browser (`trustlessWorkEscrowService.ts`), PHP persists metadata.

---

## Auth — wallet & profile

| Endpoint | Method | Used by | Week 3 |
|----------|--------|---------|--------|
| `/auth/register_wallet.php` | POST | `authService.ts`, profile | JWT |
| `/auth/verify_wallet.php` | GET | Apply, auth | JWT |
| `/auth/get_user_profile.php` | GET | `profileService.ts` | Bearer |
| `/auth/update_user.php` | PUT/PATCH | Profile | JWT = body `id` |
| `/auth/update_user_profile.php` | POST | Profile | Bearer |
| `/auth/upload_avatar.php` | POST | Profile | Bearer |
| `/auth/manage_portfolio.php` | GET/POST/DELETE | Portfolio | Bearer |
| `/auth/get_user_public_stats.php` | GET | Profile cards | Public read |

---

## Auth — disputes, ratings, transactions

| Endpoint | Method | Used by |
|----------|--------|---------|
| `/auth/create_dispute.php` | POST | `SuperviseTask.tsx` |
| `/auth/get_user_disputes.php` | GET | `disputeService.ts` |
| `/auth/get_dispute_chat.php` | GET | Dispute UI |
| `/auth/get_dispute_files.php` | GET | Dispute UI |
| `/auth/get_dispute_timeline.php` | GET | Dispute UI |
| `/auth/create_rating.php` | POST | `ratingService.ts` |
| `/auth/get_ratings.php` | GET | Ratings |
| `/auth/get_user_rating_summary.php` | GET | Ratings |
| `/auth/get_user_transactions.php` | GET | `transactionService.ts` |
| `/auth/get_user_earnings_summary.php` | GET | Dashboard wallet |
| `/auth/get_private_offers.php` | GET | `privateOffersService.ts` |

---

## Referrals & admin

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/referral_bind.php` | POST | Post-OAuth referral code |
| `/auth/admin.php` | GET/POST | Admin panel actions |
| `/auth/admin_release_dispute_funds.php` | POST | Admin dispute resolution |

Admin CORS/JWT: `admin_common.php` (same origin allowlist as `cors.php`).

---

## Stability labels

| Label | Routes |
|-------|--------|
| **Stable** | CORS helpers, `auth_bearer`, apply/create task, wallet verify/register, landing stats, platform fee |
| **In review** | Remaining PHP endpoints migrating to `arcusx_json_error` for all exit paths |
| **Deprecated** | `confirm_escrow_signature.php` |

---

*Week 3 — 2026-05-18*
