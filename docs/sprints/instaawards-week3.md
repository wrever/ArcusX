# InstaAwards / SDF — Week 3 alignment

## Design-partner pilot (1–2 real tasks)

**Goal:** One company or freelancer runs a full cycle on **testnet** before mainnet.

| Step | Owner | Done when |
|------|-------|-----------|
| Partner onboarded | Bruno | Wallet + OAuth login verified |
| Task posted | Client partner | Visible on marketplace |
| Proposal + select | Both | Escrow funded on testnet |
| Delivery + release | Both | USDC received; tx on explorer |
| Retro notes | Bruno | Blockers logged (see E2E doc) |

**Script:** [`docs/demo/E2E_TESTNET.md`](../demo/E2E_TESTNET.md)

## Reliability metrics (simple)

Track weekly from MySQL (or admin panel):

```sql
-- Tasks posted (last 7 days)
SELECT COUNT(*) FROM tasks WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Tasks completed (escrow released)
SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND escrow_status = 'completed';

-- Paid volume (USDC, completed)
SELECT COALESCE(SUM(CAST(price AS DECIMAL(18,2))), 0) FROM tasks
WHERE status = 'completed' AND escrow_status = 'completed';
```

**Drop-off funnel:** posted → proposal received → escrow funded → work started → completed → paid.

## Mainnet readiness checklist

| Item | Location | Status |
|------|----------|--------|
| `WalletNetwork.MAINNET` | `arcusx/src/hooks/useWallet.ts` | ☐ before launch |
| `VITE_STELLAR_NETWORK=mainnet` | `arcusx/.env` | ☐ |
| `VITE_TRUSTLESS_WORK_BASE_URL=mainnet` | `arcusx/.env` | ☐ |
| USDC issuer (mainnet G…) | `config/usdc.ts` | ☐ |
| Platform/admin wallets mainnet | `trustlessWork.ts` | ☐ |
| Secrets via `SetEnv` / host env | `backend_externo/.htaccess` | ☐ rotate if ever committed |
| Smoke: one $1 USDC escrow E2E | Manual | ☐ |

## Week 3 engineering tie-in

- JWT on apply/create reduces spoofed applications.
- Consistent JSON errors shorten partner debugging.
- Light theme + E2E doc lower friction for demos and pilots.

---

**Next:** Week 4 close — [`instaawards-week4.md`](./instaawards-week4.md)

*2026-05-18*
