# Week 4 — Cierre técnico (sin reviewer pack Notion)

**Fecha:** 2026-05-28

## Resuelto en código

### Week 2 testing / seguridad

| Item | Resolución |
|------|------------|
| Utility endpoints expuestos | Scripts **ausentes** del repo; no URL pública de test/reset |
| `update_user` JWT | Ya exige token + `id` = claim (`update_user.php`) |
| EvidenceUpload 404 | Componente no-op; sin import en rutas |
| `check_disputes.php` | Texto sin referencia a `create_test_dispute.php` |

**Re-verificación testnet (manual):** OAuth → crear tarea → postular → seleccionar → fondear escrow → supervisar → liberar. Script: `docs/demo/E2E_TESTNET.md`.

### i18n — 5 componentes

| Componente | Estado |
|------------|--------|
| `ProtectedRoute` | Ya usaba `t('auth.verifying')` |
| `ProposalReview` | Cadenas de error/éxito escrow → claves `proposals.error.*` / `proposals.success.contractActivated` (ES/EN/PT) |
| `SuperviseTask` | Ya mayormente `t()` |
| `CompleteTaskPopup` | Ya `t()` en pasos |
| `UserProfile` | Schema SEO + `alt` avatar → `profile.schema.*`, `profile.meta.*`, `profile.avatar.alt` |

### Console solo en dev

| Archivo | Cambio |
|---------|--------|
| `trustlessWorkEscrowService.ts` | `console.*` → `devLog` / `devWarn` / `devError` + import `logger` |
| `ProposalReview.tsx` | `console.error` → `devError` |
| `CompleteTaskPopup.tsx` | `console.error` → `devError` |
| `dashboard.tsx` | Ya guardado con `import.meta.env.DEV` en dismiss/logout |

Nuevo: `devError` en `arcusx/src/utils/logger.ts`.

### Limpieza

Ver [`week-04-cleanup-exceptions.md`](./week-04-cleanup-exceptions.md).

### Responsive 320–768px

- `arcusx/src/css/responsive-critical.css` — overflow-x, touch targets ≥44px, popups acotados.
- `dashboard.css` — `placeholder-chart` min-width 280px en ≤480px (evita overflow de página).

### Light theme Week 4

Ver [`week-04-light-theme-gaps.md`](./week-04-light-theme-gaps.md). Los 8 archivos del plan tienen overrides; gaps restantes documentados (SwapPage, admin denso).

## Pendiente solo operación / QA humano

- Grabar demo E2E o ejecutar live.
- Piloto design partner + métricas SQL (`instaawards-week4.md`).
- Deploy `dist/` + PHP si hay cambios en servidor.

## Build

```bash
cd arcusx && npm run build
```

---

*Reviewer pack (Notion, links) — fuera de alcance; lo completa el equipo.*
