# cPanel: 404 en el subdominio (`empresas.*`)

**No hace falta un segundo proyecto ni otro `npm run build`.** El mismo `dist/` sirve para el dominio principal y para el subdominio. Un 404 casi siempre significa **archivos en la carpeta equivocada** o **falta `.htaccess`**.

## 1. Comprobar a qué carpeta apunta el subdominio

1. En cPanel: **Dominios** → **Subdominios** (o **Subdomains**).
2. Buscá `empresas.tudominio.com` y mirá la columna **Directorio raíz** / **Document root** (ej. `public_html/empresas` o `empresas.tudominio.com`).
3. Esa carpeta es **la única** que Apache usa para ese host. **No es** la misma que `public_html` salvo que lo hayas configurado así a propósito.

Si subiste el sitio solo a `public_html/` y el subdominio apunta a `public_html/empresas`, esa segunda carpeta puede estar **vacía** → **404**.

### Solución

- Abrí el **Administrador de archivos** y entrá a la carpeta **exacta** del document root del subdominio.
- Subí ahí **todo** el contenido de `dist/`:
  - `index.html`
  - carpeta `assets/` (con los `.js` y `.css` hasheados)
  - `.htaccess` (importante)
  - `favicon.ico`, `robots.txt`, etc. si los genera el build

Debe verse **igual** que en la raíz del dominio principal (mismos archivos, misma versión).

## 2. Comprobar que exista `index.html`

En la carpeta del subdominio tiene que haber un archivo **`index.html`** en la raíz (no dentro de otra subcarpeta tipo `dist/index.html`).

**Mal:** `public_html/empresas/dist/index.html`  
**Bien:** `public_html/empresas/index.html`

Subí el **contenido** de la carpeta `dist`, no la carpeta `dist` como contenedor, salvo que tu raíz sea explícitamente `.../empresas/dist/`.

## 3. `.htaccess` y SPA (React Router)

Sin reglas de reescritura, rutas como `/login` pueden fallar al recargar. El build ya intenta copiar `.htaccess` desde `backend_externo/.htaccess` a `dist/.htaccess`.

- Asegurate de que **`dist/.htaccess`** exista después de `npm run build`.
- Súbelo a la **raíz** de la carpeta del subdominio (junto a `index.html`).

Incluye al menos:

- `DirectoryIndex index.html`
- `mod_rewrite` redirigiendo rutas inexistentes a `index.html` (ver `backend_externo/.htaccess`).

Si tu hosting desactiva `.htaccess` (raro en cPanel), contactá al soporte para **AllowOverride** o equivalente.

## 4. Archivos por defecto de cPanel

Si en la carpeta del subdominio hay un **`default.html`** o similar generado por cPanel y está vacío o viejo, podría interferir. Renombralo o borralo si no lo usás.

## 5. DNS y SSL

- Si el subdominio acaba de crearse, esperá unos minutos a que propague el DNS.
- Un error de certificado SSL no suele ser 404 HTML plano; si ves pantalla del navegador sobre SSL, resolvé el certificado en cPanel (**SSL/TLS Status**).

## 6. Resumen rápido

| Problema | Qué revisar |
|----------|-------------|
| 404 en `https://empresas.../` | ¿Hay `index.html` en el **document root** del subdominio? |
| Solo funciona el dominio principal | Subí el mismo `dist/` también a la carpeta del subdominio |
| 404 al entrar a `/login` recargando | Falta o falla `.htaccess` (rewrite a `index.html`) |

## ¿Hace falta otro repositorio o build?

**No.** Mismo `dist/`, misma app. Solo duplicá el despliegue en la carpeta correcta del subdominio y mantené ambas ubicaciones actualizadas cuando hagas un nuevo build.
