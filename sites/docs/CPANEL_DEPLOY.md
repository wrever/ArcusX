# cPanel: docs.arcusx.pro (frontend React SPA)

## Por qué `/developers` da 404 y la home no

Es una **SPA** (React Router). Desde `https://docs.arcusx.pro` al hacer clic, el browser no pide otro HTML al servidor → **200**.

Si entras directo a `https://docs.arcusx.pro/developers` (o recargas), LiteSpeed busca un archivo `/developers` en disco. **Sin `.htaccess` SPA** → **404 LiteSpeed**.

Eso **no** es un bug de React: falta rewrite a `index.html` en el document root de `docs.*`.

Comprobado en vivo (patrón típico):

| URL | Resultado si falta `.htaccess` en docs |
|-----|----------------------------------------|
| `https://docs.arcusx.pro/` | 200 (`index.html`) |
| `https://docs.arcusx.pro/developers` | **404 LiteSpeed** |
| `https://arcusx.pro/developers` | 200 (mismo SPA + `.htaccess` OK) |

## Deploy correcto

1. `cd arcusx && npm run build`
2. Subí **todo** el contenido de `arcusx/dist/` (incluye **`.htaccess`**, `index.html`, `assets/`)
3. En cPanel → Dominios / Subdominios → `docs.arcusx.pro` → **Document root**:
   - **Ideal:** el mismo `public_html` que `arcusx.pro`, **o**
   - Si es otra carpeta (`public_html/docs`, etc.): ahí también debe estar el **mismo** `dist/` **con** `.htaccess`
4. Purge Cloudflare si cachea 404s

**No** subas VitePress ni `sites/docs/dist`. **No** uses el `.htaccess` viejo de VitePress (`sites/docs/public/.htaccess`).

## Verificación

```bash
# Debe ser HTTP 200 (no 404 LiteSpeed)
curl -sI https://docs.arcusx.pro/developers | head -5

# Home docs
curl -sL https://docs.arcusx.pro/ | grep -o '<title>[^<]*</title>'
```

En File Manager del **document root de docs**:

- [ ] Existe `index.html`
- [ ] Existe `.htaccess` (el de `arcusx/public/.htaccess` / `dist/.htaccess`)
- [ ] Existe carpeta `assets/`
- [ ] No hay un `default.html` de cPanel tapando el sitio

## Si el subdominio apunta a carpeta aparte

Duplicá el deploy (o apuntá el root al mismo `public_html`). Sin `.htaccess` en **esa** carpeta, `/developers` seguirá en 404 aunque `arcusx.pro` funcione perfecto.
