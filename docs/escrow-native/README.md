# Escrow nativo ArcusX

**Carpeta única del sistema** — docs, Edge Functions, cliente TS, WASM Soroban y migraciones.

## Documentación

| Archivo | Contenido |
|---------|-----------|
| **[GUIA.md](./GUIA.md)** | Arquitectura, flujos, comisiones, red, seguridad, integración |
| **[API.md](./API.md)** | Endpoints Edge (público + admin) |
| **[CONTRATO.md](./CONTRATO.md)** | Spec WASM `arcusx-escrow` (Fase S2) |
| **[CHECKLIST.md](./CHECKLIST.md)** | Avance, testnet, gate de deploy |
| **[CAPABILITY_MATRIX.md](./CAPABILITY_MATRIX.md)** | ¿Soporta Deals, agentic, Guard? Gaps v2 |

Puntero en raíz del repo: [`ARCUSX_ESCROW_NATIVO_PLAN.md`](../../ARCUSX_ESCROW_NATIVO_PLAN.md)

## Estructura

```
docs/escrow-native/
├── README.md · GUIA.md · API.md · CONTRATO.md · CHECKLIST.md
├── shared/usdc-issuers.ts
├── contracts/arcusx-escrow/     # cargo test
├── supabase/migrations/
├── supabase/functions/escrow-*  # + _shared/
├── client/                      # SDK TS (Fase 6 → arcusx)
├── integration/                 # plantilla escrowService
└── admin/                       # panel admin (plantilla)
```

## Resumen técnico

- Escrow = contrato **Soroban `C…`** (no cuentas `G…` por tarea).
- **S1:** API Trustless Work · comisión on-chain 3% cliente.
- **S2:** WASM propio · 1,5% + 1,5% bilateral.
- USDC issuers: `shared/usdc-issuers.ts`.

⛔ Sin deploy Supabase hasta [CHECKLIST.md](./CHECKLIST.md) en verde.

*ArcusX · Mayo 2026*
