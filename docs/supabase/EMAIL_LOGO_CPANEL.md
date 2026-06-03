# Logo in notification emails

## Asset

| File | Purpose |
|------|---------|
| `arcusx/src/images/arcusxmail.jpg` | Source (design) |
| `arcusx/public/arcusxmail.jpg` | Copied for Vite build → ends up in `dist/` root |

Emails use a **centered circular crop** (96×96px) via HTML/CSS in `email-templates.ts`.

Default URL: **`https://arcusx.pro/arcusxmail.jpg`**

Override in Supabase Edge Secrets: `ARCUSX_EMAIL_LOGO_URL=https://arcusx.pro/arcusxmail.jpg`

## Deploy to production (cPanel)

1. `cd arcusx && npm run build`
2. Upload **`arcusxmail.jpg`** from `arcusx/dist/` to **`public_html/`** (same level as `index.html`)
3. Verify: https://arcusx.pro/arcusxmail.jpg

Do **not** use `data:image` base64 in templates — Gmail/Resend often block it.

## Redeploy Edge after template changes

```bash
node scripts/bundle-edge-fn.mjs arcusx-email-worker
node scripts/deploy-management-multipart.mjs supabase/.deploy/arcusx-email-worker.json
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/deploy-management-multipart.mjs supabase/.deploy/arcusx-api.json
```

## Legacy logo

`arcus-logo.png` remains for the website README/nav; **notification emails** use `arcusxmail.jpg` only.
