# Switch Trustless Work → WASM ArcusX (sin lanzar hasta aviso)

**Estado actual:** producción sigue en `ESCROW_BACKEND=tw`. Todo lo nuevo está **preparado**, no activo.

---

## Qué ya está listo

| Pieza | Ubicación |
|-------|-----------|
| Contrato v1 + 14 tests seguridad | `contracts/arcusx-escrow/` |
| Auditoría interna | `contracts/arcusx-escrow/SECURITY_AUDIT.md` |
| Router backend | `supabase/functions/_shared/escrow-backend.ts` |
| XDR WASM (ops simples) | `native-wasm-escrow.ts` |
| Multi-milestone Deals (TW) | `multi-release-escrow.ts` |
| Single-release (TW + router) | `soroban-escrow.ts` |

---

## Secuencia cuando des el aviso

1. **Testnet E2E** con `cargo test` + deploy WASM testnet → anotar `ARCUSX_ESCROW_WASM_HASH`.
2. **Supabase secrets** (Edge):
   ```
   ESCROW_BACKEND=native_wasm
   ESCROW_NATIVE_ENABLED=true
   ARCUSX_ESCROW_WASM_HASH=<hash>
   STELLAR_NETWORK=testnet
   ```
3. **Frontend** (solo tras E2E verde):
   ```
   VITE_ESCROW_NATIVE_ENABLED=true
   ```
4. **Migración** `escrow_provider = native_soroban` en tasks/deals nuevos.
5. **Mainnet:** auditoría externa WASM + repetir E2E mainnet antes de flags prod.

---

## Mientras tanto (Deals milestone)

Usar **TW multi-release** (`multi-release-escrow.ts`), no WASM v2:

- Deploy: `prepareDeployMultiRelease`
- Por hito: complete → approve → `prepareReleaseMultiMilestone`

Alternativa E1: **N contratos** single-release v1 (mismo WASM ArcusX cuando switch).

---

## Rollback

```
ESCROW_BACKEND=tw
ESCROW_NATIVE_ENABLED=false
VITE_ESCROW_NATIVE_ENABLED=false
```

Contratos `C…` ya desplegados siguen on-chain; solo deja de preparar XDR vía WASM.

---

*Checklist gate:* [CHECKLIST.md](./CHECKLIST.md)
