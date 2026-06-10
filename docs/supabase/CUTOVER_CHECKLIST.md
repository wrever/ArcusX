# Cutover PHP → Supabase — Checklist

Plan maestro: [`TRANCHE2_EXECUTION_PLAN.md`](../sprints/TRANCHE2_EXECUTION_PLAN.md) · **Cierre:** [`TRANCHE2_CLOSURE.md`](../sprints/TRANCHE2_CLOSURE.md) · **Siguiente:** [`POST_TRANCHE2_TODO.md`](../sprints/POST_TRANCHE2_TODO.md)

## Pre-deploy

- [ ] `ARCUSX_JWT_SECRET` en Edge Secrets (= PHP)
- [ ] `ARCUSX_CORS_ORIGINS` incluye prod + localhost
- [ ] Migración `20260531140000_backend_completion.sql` aplicada
- [x] Deploy `arcusx-api` **v28**, `arcusx-admin` **v15**, `arcusx-escrow-reconcile` **v7**, `arcusx-email-worker` **v6**
- [x] Smoke `node scripts/smoke-edge-api.mjs` → 7/7

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
cd /Users/mac/Documents/GitHub/ArcusX
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/deploy-management-multipart.mjs arcusx-api
node scripts/bundle-edge-fn.mjs arcusx-admin
node scripts/deploy-management-multipart.mjs arcusx-admin
node scripts/bundle-edge-fn.mjs arcusx-escrow-reconcile
node scripts/deploy-management-multipart.mjs arcusx-escrow-reconcile
```

## Build frontend

- [x] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` en build prod (cPanel subido)
- [x] **No** `VITE_USE_PHP_API=true`
- [x] `arcusxmail.jpg` en raíz prod (HTTP 200 verificado)

## Smoke automático (sin login)

```bash
node scripts/smoke-edge-api.mjs
```

## Smoke (testnet, manual)

- [ ] OAuth → dashboard
- [ ] Crear tarea → postular → escrow → completar
- [ ] Notificación aparece (Realtime o refresh)
- [ ] Mensaje en SuperviseTask (Realtime)
- [ ] Deal: crear link → aceptar
- [ ] Admin login → stats

## Post-cutover

- [ ] Network: 0 requests a `arcusx.pro/api/*.php` en flujo feliz
- [ ] PHP marketplace en modo solo lectura o 410 (2 semanas rollback)
