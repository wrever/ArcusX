# ArcusX Partner API Gateway

Proxy delante de Supabase Edge para que **integradores externos** no necesiten:

- `SUPABASE_ANON_KEY`
- URL del proyecto Supabase
- JWT de sesión OAuth

## Modelo (como Soroswap / Trustless Work)

```bash
curl -X POST https://api.arcusx.pro/v1/jobs \
  -H "Authorization: Bearer axk_test_…" \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi job"}'
```

Solo **una credencial**: la API key del dashboard (`/dashboard/developer`).

## Deploy (Cloudflare Workers)

```bash
cd infra/partner-api-gateway
npm i -g wrangler   # o npx wrangler
wrangler secret put SUPABASE_ANON_KEY
wrangler deploy
```

En Cloudflare → Workers → Custom Domain → `api.arcusx.pro`.

## Variables

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `SUPABASE_ARCUSX_API_ORIGIN` | var | `https://<ref>.supabase.co/functions/v1/arcusx-api` |
| `SUPABASE_ANON_KEY` | secret | Anon key del proyecto (solo en el worker, nunca en partners) |

## Seguridad

- El anon key **nunca** se entrega a usuarios/partners.
- Partners solo reciben `axk_test_` / `axk_live_` revocables.
- El worker valida que el Bearer empiece por `axk_` antes de proxear.
