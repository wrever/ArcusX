# ArcusX SDK Playground

**Proyecto demo independiente** — simula un integrador B2B que consume `@arcusx/sdk` por primera vez. No es parte del frontend `arcusx/`.

## Por qué existe

- Probar el SDK aislado del marketplace principal
- Ver respuestas JSON en vivo (REST `/v1/` o legacy `?action=`)
- Validar partner API key + JWT sin tocar producción UI

## Arranque

```bash
# 1. Build del SDK (monorepo)
cd packages/arcusx-sdk && npm install && npm run build

# 2. Playground
cd ../../examples/sdk-playground
cp .env.example .env.local   # edita keys
npm install
npm run dev
```

Abre `http://localhost:5199`.

## Variables (.env.local)

| Variable | Uso |
|----------|-----|
| `VITE_ARCUSX_API_URL` | `…/functions/v1/arcusx-api` |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| `VITE_ARCUSX_API_KEY` | `axk_test_…` partner sandbox |
| `VITE_ARCUSX_USER_JWT` | JWT app (opcional) |
| `VITE_ARCUSX_USER_ID` | ID numérico MySQL user (para `create`) |

La UI guarda overrides en `localStorage` — no hace falta rebuild al cambiar credenciales.

## Flujo de prueba sugerido

1. **public** — `getPlatformFee`, `getMarketStats`, `getTasks` (sin JWT)
2. Pega JWT + userId → **marketplace** `listMine`, `create`
3. **deals** / **escrow** con IDs reales de testnet
4. **settlement** solo con `tx_hash` reales (Stellar)

## Relación con otros ejemplos

| Carpeta | Tipo |
|---------|------|
| `examples/sdk-node-*` | Scripts CLI headless |
| `examples/sdk-playground` | UI interactiva para QA manual |
