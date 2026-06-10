# Week 4 — Limpieza CSS / backups: excepciones documentadas

## Eliminado / no presente en repo

| Item | Estado |
|------|--------|
| `*.bak` en `arcusx/` | **Ninguno** encontrado |
| `create_test_dispute.php`, `reset_user_limits.php`, `reset_human_id_action_id.php` | **No existen** en `backend_externo/` (requisito Week 2 cumplido por ausencia) |

## Excepciones (mantener)

| Archivo | Motivo |
|---------|--------|
| `arcusx/src/components/EvidenceUpload.tsx` | Componente **no-op** (`return null`) — evita 404 de upload legacy; Week 1 |
| `arcusx/src/css/EvidenceUpload.css` | **No importado** en bundle; estilos huérfanos. Seguro borrar en ciclo futuro o dejar hasta integrar evidencia |
| `arcusx/.claude-flow/` | Datos locales de tooling; no es CSS de producto |
| `docs/escrow-native/` | Kit de referencia Soroban; no es CSS del frontend Vite |

## Cambios Week 4

| Cambio | Archivo |
|--------|---------|
| Mensaje admin sin referencia a script de test | `backend_externo/check_disputes.php` |
| Responsive compartido flujos críticos | `arcusx/src/css/responsive-critical.css` |

## Recomendación post–Week 4

- Borrar `EvidenceUpload.css` si se confirma que no se importará en 90 días.
- `rg "import.*EvidenceUpload"` antes de eliminar componente.

---

*2026-05-28*
