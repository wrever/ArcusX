# ArcusX — Tesis del riel (SDK)

**Una frase:** Somos a la ejecución de trabajo lo que TW es al escrow — pero nosotros **somos** el escrow + lifecycle + disputas + settlement, empaquetado para que terceros no lo construyan.

## División de responsabilidades

| Ellos (integrador) | Nosotros (ArcusX riel) |
|--------------------|-------------------------|
| UX, branding, CRM | Escrow USDC Stellar |
| Matching / discovery | Comisión bilateral (quote) |
| Onboarding usuarios | Persistencia tasks/deals |
| Embed del SDK | Disputas + resolución ArcusX |
| `external_id` de su sistema | Evidencia, ratings, notificaciones |
| Wallet en su app (Freighter) | Validación `tx_hash` on-chain |

## Analogía TW (fase actual → futuro nativo)

| Capa | Hoy (fase inicial) | Evolución ArcusX |
|------|-------------------|------------------|
| **Motor escrow** | Trustless Work (contratos Soroban vía su API) | Escrow nativo propio (`docs/escrow-native/`, WASM `arcusx-escrow`) |
| **Capa ejecución + cobro** | ArcusX Edge + SDK | Misma superficie; cambia solo el provider detrás |
| **Integrador** | Solo ve `@arcusx/sdk` | Sin cambios — TW nunca fue visible |

- **Trustless Work** = motor de contratos (oculto). Nosotros lo usamos porque aceleramos el time-to-market.
- **ArcusX** = capa de **ejecución infalible**: trabajo acordado → escrow → evidencia → disputas → settlement → comisión on-chain. El integrador arma un marketplace en días, no meses.

El integrador **no importa TW** y **no tiene API key TW**. Llama `@arcusx/sdk` → nuestra Edge (con nuestra key TW hoy; con nuestro contrato nativo mañana) → Stellar. La comisión ArcusX va embebida en el quote y en el contrato (`platformAddress` = nuestra wallet). Nadie puede registrar un escrow ajeno: Edge valida on-chain que `platformAddress` sea ArcusX.

## Tres entradas, un riel

```
Marketplace público ──┐
Oferta privada 1:1  ──┼──► Work bound ──► Escrow ──► Verify ──► Settlement
Deal por link       ──┘                              │
                                                     └──► Disputa (si aplica)
```

## SDK v0.2 — superficie “riel completo”

| Módulo | Para qué |
|--------|----------|
| `public` | Fee, stats, listados |
| `marketplace` / `private` / `deals` | Crear y gestionar trabajo |
| `escrow` | Quote + metadata + deal prepare/finalize |
| `settlement` | Cerrar con `tx_hash` |
| `disputes` | Listar, abrir, chat/files/timeline |
| `evidence` | Ver entregables milestone/deal |
| `ratings` | Reputación post-cierre |
| `trust` | Registrar/verificar wallet Stellar |

## Próximo (v0.3)

- `escrow.prepareFund()` / `confirmFund()` — TW 100% oculto
- Webhooks partner (`work.funded`, `dispute.opened`, `settlement.released`)
- Upload evidencia vía SDK (multipart)

## Pitch integrador

> “Conectá tu plataforma en un día. Nosotros movemos el USDC, resolvemos disputas y liberamos on-chain. Vos te quedás con el usuario y el producto.”
