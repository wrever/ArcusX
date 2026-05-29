# v2.1 — Refund / cancel (borrador, no implementado)

**Estado:** planificación · **post-auditoría v1**

Objetivo: reembolso al fondeador (Guard red flag, cancel deal) **sin** abrir vector de drenaje masivo.

---

## 1. Amenazas a mitigar

- Llamada remota sin firma
- IA o cron con clave admin filtrada
- Refund doble (replay)
- Refund &gt; balance

---

## 2. Funciones propuestas

### `refund_to_approver(env, signer: Address)`

| Regla | Valor |
|-------|-------|
| `signer` | Debe ser `roles.approver` **o** `roles.dispute_resolver` |
| Estado | `Funded` only (no post-release) |
| Flags | `!released && !resolved` |
| Monto | 100% balance → `approver` (menos fee ya cobrada si aplica — definir) |
| Auth | `signer.require_auth()` |

### `refund_by_resolver(env, resolver, distributions: Vec<Distribution>)`

Alias de `resolve` con semántica “full refund to approver” o reutilizar `resolve` existente — **preferir no duplicar**: Guard usa `dispute` + `resolve` al approver.

**Recomendación v2.1:** **no nueva función** si `resolve` cubre 100% al approver; solo documentar flujo Guard.

Si se añade `refund_to_approver`: solo para cancel **sin** disputa previa (ahorro gas UX).

---

## 3. Quién firma (nunca la IA)

| Escenario | Firmante on-chain |
|-----------|-------------------|
| Cliente cancela deal | `approver` |
| Guard red flag + cliente confirma | `approver` |
| Fraude, disputa abierta | `dispute_resolver` (admin) tras dual agree |
| Automático “sin humano” | **No en mainnet** |

---

## 4. Edge

```ts
// prepare_refund_xdr → unsigned
// Cliente o admin firma en Freighter
// confirm_refund → submit
```

Sin `STELLAR_SECRET` en Edge para usuarios estándar.

---

## 5. Tests requeridos

- refund solo approver auth
- refund fails if released
- refund fails wrong signer
- double refund fails
- resolver path igual que resolve test existente

---

## 6. Decisión pendiente

| Opción | Pros |
|--------|------|
| A) Solo `dispute` + `resolve` | Sin nuevo código WASM |
| B) `refund_to_approver` | Menos fricción UX cancel |

**Decidir en E0.3** antes de implementar B.

---

*Seguridad:* [SECURITY_MODEL.md](./SECURITY_MODEL.md)
