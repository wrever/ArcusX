# ArcusX SDK — local-test (partner path)

Harness en localhost para probar **`@arcusx/sdk` como lo usa un integrador**:

- Solo **API key** (`axk_test_…`)
- Sin JWT de ArcusX OAuth
- Sin Freighter / xBull / Pollar (la wallet la pone cada app)

## Qué simula

| Caso de uso | SDK |
|-------------|-----|
| Mostrar board / fee de ArcusX | `public.*` |
| Calcular payout / fee | `escrow.quote` |
| Preview de payment link | `deals.getByToken` |

Crear tasks, apply, firmar escrow on-chain = **auth de usuario + wallet en la app del partner** (no en este harness).

## Arranque

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test
npm install
npm run dev
```

→ http://localhost:5200

Pega tu `axk_test_…` y dale a **Smoke partner**.

### Si ves `Failed to fetch`

El SDK manda el header `x-arcusx-network`. En el browser eso dispara CORS preflight; el gateway público a veces no lo listaba → el browser corta la request.

En **DEV**, Vite proxea `/partner-api` → `https://api.arcusx.pro` (sin CORS). Dejá la URL vacía. Reiniciá `npm run dev` si cambiaste `vite.config.ts`.
