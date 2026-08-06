# ArcusX docs (`docs.arcusx.pro`)

Frontend React público (mismo `arcusx/dist` que la app). **No** se publica el markdown interno de `/docs` (sprints, planes, Instawards, etc.).

## Cómo funciona

Igual que `empresas.*`: un solo upload. El hostname decide el árbol React.

```
arcusx/dist/
  index.html
  assets/
  .htaccess
```

| Host | UI |
|------|-----|
| arcusx.pro | Marketplace |
| empresas.* | Landing B2B |
| docs.* | Documentación de producto |

## Build & deploy

```bash
cd arcusx && npm run build
# Subí el contenido de dist/ a public_html
# Document root de docs.arcusx.pro = el mismo public_html
```

## Contenido público

Editá copy en [`arcusx/src/content/docs/publicDocs.ts`](../../arcusx/src/content/docs/publicDocs.ts)  
UI: [`arcusx/src/pages/docs/`](../../arcusx/src/pages/docs/)

El directorio monorepo `/docs` (VitePress, sprints, …) es **solo interno** para el equipo.

Ver [CPANEL_DEPLOY.md](./CPANEL_DEPLOY.md).
