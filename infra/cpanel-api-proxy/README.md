# api.arcusx.pro en cPanel (sin Cloudflare)

Reenvía `https://api.arcusx.pro/v1/...` → Supabase `arcusx-partner-api`.

El integrador solo usa `Authorization: Bearer axk_…`. **No** hace falta anon key ni token Cloudflare.

## 1. Crear subdominio en cPanel

1. **cPanel → Dominios → Crear un subdominio**
2. Subdominio: `api`
3. Dominio: `arcusx.pro`
4. Document root sugerido: `/public_html/api` (o el que te asigne cPanel)
5. Crear

Espera unos minutos a que DNS propague (mismo servidor que arcusx.pro).

## 2. Subir archivos

Copia a la carpeta del subdominio (`public_html/api/` o equivalente):

- `proxy.php`
- `.htaccess`

Desde tu Mac:

```bash
scp infra/cpanel-api-proxy/proxy.php infra/cpanel-api-proxy/.htaccess \
  usuario@tuservidor:~/public_html/api/
```

(O File Manager de cPanel → Subir.)

## 3. Probar

```bash
curl -s "https://api.arcusx.pro/v1/config/platform-fee" \
  -H "Authorization: Bearer axk_test_TU_KEY"
```

Con key válida deberías ver el fee de plataforma. Con key inválida: `invalid_api_key`.

## 4. Actualizar SDK (opcional)

Cuando funcione, el default del SDK puede ser `https://api.arcusx.pro` (sin path extra; el SDK añade `/v1`).

## Seguridad

- No subas `.env` con secrets a `public_html`.
- El proxy **no** necesita anon key: delega en `arcusx-partner-api`.
- Solo reenvía headers del cliente; la API key va en `Authorization`.

## Alternativa Apache (si tu host tiene mod_proxy)

En `.htaccess` del subdominio:

```apache
RewriteEngine On
RewriteRule ^(.*)$ https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-partner-api/$1 [P,L]
```

Requiere `mod_proxy` + `mod_proxy_http`. Muchos shared hosting lo desactivan; el PHP proxy suele funcionar siempre.
