# ArcusX SDK — Modelo de comisión (fee)

**Fuente de verdad código:** `arcusx/src/utils/bilateralFeeModel.ts` · `supabase/functions/_shared/bilateral-fee.ts`

El SDK y la REST API **no recalculan** comisiones. Consumen quotes del Edge.

---

## On-chain (realidad técnica)

| Componente | Tasa | Sobre qué |
|------------|------|-----------|
| ArcusX platform | **3.7%** (`platform_fee` en BD = `0.037`) | Monto del hito escrow (worker net) |
| Protocolo TW | **0.3%** fijo | Al liberar |
| **Total efectivo** | **~4% del total fondeado** | Empleador fondea `clientTotal` |

---

## UX bilateral (lo que ve el integrador en copy)

| Rol | Fórmula | Ejemplo nominal $20 |
|-----|---------|---------------------|
| Valor de referencia (BD) | `nominal` | $20.00 |
| Empleador fondea | `nominal × 1.02` | **$20.40** (+2% visible) |
| Trabajador recibe neto | `clientTotal × 0.96` | **~$19.58** |
| Hito escrow on-chain | `workerNet` | ~$19.58 |

**Pitch partner (una línea):** “+2% al empleador al fondear; el trabajador ve ganancia neta tras comisión.”

No decir “4%” en copy comercial del empleador — es el total on-chain sobre el fondeo.

---

## Qué expone el SDK

### `public.getPlatformFee()`

Devuelve `platform_fee` decimal desde Edge (ej. `0.037`). **No** incluye el 0.3% TW ni el +2% UX empleador.

### `escrow.quote()` (Fase 2c)

Respuesta objetivo:

```typescript
interface EscrowQuote {
  nominal: number;           // task.price / deal.amount_usdc
  workerNet: number;         // hito escrow
  clientTotal: number;       // lo que fondea el empleador
  clientVisibleFee: number;  // nominal × 0.02
  platformFeeRate: number;   // 0.037
  fundAmount: number;        // total on-chain a depositar
  currency: 'USDC';
}
```

Cálculo en Edge (`quoteBilateralFromNominal` + `quoteEscrowCommission`) — el SDK solo tipa y reenvía.

### Reglas SDK

1. **Nunca** importar lógica de `bilateralFeeModel` en el paquete publicado (opcional: re-exportar tipos read-only en v0.2).
2. Documentar en QUICKSTART que `price` / `amount_usdc` = valor nominal de referencia.
3. Ejemplos partner muestran `clientTotal` al empleador y `workerNet` al trabajador cuando aplique.

---

## Migración desde docs “3%”

Docs legacy (support FAQ, landing) pueden decir 3%. **SDK y REST v1** usan el modelo bilateral actualizado desde 2026-05-28.

| Doc | Acción |
|-----|--------|
| `API_REFERENCE.md` | `FeeQuote` con campos bilateral |
| `REST_V1.md` | §7 comisión actualizada |
| `REVENUE_STACK.md` | Nota “hoy 3.7%+0.3%” |
| `scripts/smoke-edge-api.mjs` | Esperar `0.037` |
| InstaAwards W3 | “Platform fee” → bilateral copy |

---

*Si cambia `platform_fee` en BD, el SDK no requiere release — solo consume el valor actual.*
