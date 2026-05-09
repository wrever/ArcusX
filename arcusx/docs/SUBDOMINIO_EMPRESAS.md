# Subdominio `empresas.arcusx.pro` (mismo build que el sitio público)

**No existe un “build de empresas” aparte.** El subdominio sirve **el mismo `dist/`** que `arcusx.pro`: un solo `npm run build`, un solo deploy del artefacto estático.

**¿404 solo en el subdominio?** No separés el sitio en otro proyecto: casi siempre falta subir `dist/` a la **carpeta raíz que cPanel asignó al subdominio** (suele ser distinta de `public_html`). Guía paso a paso: [`docs/CPANEL_SUBDOMINIO_404.md`](./CPANEL_SUBDOMINIO_404.md).

## Por qué funciona con un solo `dist`

- La app es una **SPA** (Vite + React): todas las rutas resuelven a `index.html`.
- El modo “landing empresas” se elige por **hostname en tiempo de ejecución** (`empresas.*`), no por un bundle distinto.
- Las variables `VITE_*` se **incrustan al compilar**. No hace falta un build por dominio si usás **un mismo `.env.production`** con URLs públicas (p. ej. `VITE_MAIN_SITE_URL=https://arcusx.pro`) válidas para ambos sitios.

## Comportamiento

| Host | Ruta `/` | Ruta `/empresas` |
|------|----------|------------------|
| `arcusx.pro` | Home público (Hero) | Landing B2B + Navbar normal |
| `empresas.arcusx.pro` | **Landing B2B** + `EmpresasNavbar` | Redirige a `/` |

La detección es automática si el hostname empieza por `empresas.` (sin distinguir mayúsculas).

## Checklist de deploy (subdominio)

1. **Build una vez** en el repo: `npm run build` → carpeta `dist/`.
2. **Subí el mismo `dist`** al hosting de `arcusx.pro` y al de `empresas.arcusx.pro` (mismo contenido), o serví ambos hostnames desde el mismo origen (CDN / bucket / nginx).
3. **DNS**: `empresas` → mismo tipo de registro que usás para el dominio principal (`A` o `CNAME` al mismo destino).
4. **Servidor / CDN**: virtual host o regla para `empresas.arcusx.pro` con **mismo `root`** que el sitio principal, y **fallback SPA** a `index.html` para rutas no encontradas.
5. **HTTPS**: certificado que incluya `empresas.arcusx.pro` (wildcard `*.arcusx.pro` o SAN).

No hace falta duplicar el proyecto ni correr dos builds por el subdominio.

## cPanel: subdominio en carpeta distinta a la raíz

En cPanel **sí** suele crearse una carpeta aparte para el subdominio (ej. `public_html/empresas` o `empresas.arcusx.pro/` como document root). **No es un problema**: no comparten carpeta con el dominio principal, pero **deben tener el mismo contenido** que el `dist/` del build.

1. **Generá** `dist/` una vez con `npm run build`.
2. **Subí todo el contenido de `dist/`** (archivos sueltos, no la carpeta `dist` como tal) a la **raíz del sitio principal** (`public_html` o la que uses).
3. **Subí el mismo contenido** (mismos archivos, mismas versiones) a la **document root del subdominio** (la carpeta que cPanel asignó a `empresas.arcusx.pro`).
4. En cada deploy, repetí **los dos uploads** (o un script que copie el mismo `dist` a ambas rutas).  
   Si solo un subdominio se actualiza, quedarás con versiones distintas y errores de SPA o caché.

**Importante:** en `configuración` del subdominio en cPanel, la **raíz** del subdominio debe apuntar a la carpeta donde subiste los archivos; y **DirectoryIndex** / reglas deben servir `index.html` para rutas de la SPA.

## Variables de entorno (`.env` / `.env.production` del build)

| Variable | Uso |
|----------|-----|
| `VITE_MAIN_SITE_URL` | URL del sitio público (p. ej. `https://arcusx.pro`). Enlaces “ArcusX público”, canonical alternativo y footer legal. |
| `VITE_ENTERPRISE_APP_URL` | URL exacta del CTA **Entrar al portal**. Si está vacío: en `empresas.*` se usa `{origen}/login`. |
| `VITE_ENTERPRISE_LANDING_URL` | URL base de la landing B2B para enlaces externos (p. ej. desde la página de elegir portal). Por defecto `https://empresas.arcusx.pro`. |
| `VITE_ENTERPRISE_LANDING_HOST` | `true` \| `false`: fuerza modo “landing en `/`” sin depender del hostname (útil en local). Si se omite, solo cuenta el hostname `empresas.*`. |

## Enlaces legales

El footer de la landing B2B apunta a `{VITE_MAIN_SITE_URL}/privacy` y `/terms`. Asegurate de que existan en el dominio público o ajustá las rutas en `EmpresasPage.tsx` si usás otras URLs.
