# ArcusX SDK Playground

**Proyecto demo independiente** — simula un integrador B2B que consume `@arcusx/sdk`. No es parte del frontend `arcusx/`.

## Por qué existe

- Probar el SDK aislado del marketplace principal
- Ver respuestas JSON en vivo (REST `/v1/`)
- Validar partner API key + JWT sin tocar la UI de producción
- SOW 2 Week 3: tabs **suite** (7 checks PASS/FAIL), **award→ready**, **rail E2E**, **webhooks**

Harness partner más simple (solo API key): [`../../local-test`](../../local-test/) → `:5200`.

## Arranque

```bash
cd packages/arcusx-sdk && npm install && npm run build
cd ../../examples/sdk-playground
cp .env.example .env.local   # VITE_ARCUSX_API_KEY=axk_test_…
npm install
npm run dev
```

→ http://localhost:5199  

En **DEV**, la base URL por defecto es el proxy Vite `/partner-api` → `https://api.arcusx.pro` (evita CORS del header `x-arcusx-network`). Dejá **API URL** vacío en la UI.

## Variables (.env.local)

| Variable | Uso |
|----------|-----|
| `VITE_ARCUSX_API_URL` | Override (vacío = proxy DEV / gateway) |
| `VITE_SUPABASE_ANON_KEY` | Solo si apuntás directo a Edge |
| `VITE_ARCUSX_API_KEY` | `axk_test_…` partner sandbox |
| `VITE_ARCUSX_USER_JWT` | JWT app (prepare*/marketplace) |
| `VITE_ARCUSX_USER_ID` | ID usuario (create) |

Overrides en `localStorage` — no hace falta rebuild al cambiar credenciales.

## Flujo de prueba (Week 3)

1. **suite** — un click: fee 0.02 · stats · tasks · quote · errores · HMAC
2. **public** / board manual si querés inspeccionar JSON
3. **award→ready** / **rail E2E** — solo si tenés JWT + IDs (flujo usuario; firma = app partner)
4. **webhooks** — HMAC local

## Relación con otros ejemplos

| Carpeta | Tipo |
|---------|------|
| `examples/sdk-node-escrow` | CLI quote → prepare → confirm |
| `examples/sdk-node-webhooks` | HMAC headless |
| `examples/sdk-freighter-adapter` | WalletAdapter Freighter |
| `examples/sdk-playground` | UI interactiva QA |
