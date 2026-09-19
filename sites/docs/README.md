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

| Archivo | Qué |
|---------|-----|
| [`guidesDocs.ts`](../../arcusx/src/content/docs/guidesDocs.ts) | **Modo humano** — manuales: cuenta, marketplace, privado, deals, pagos, disputas, empresas |
| [`buildersDocs.ts`](../../arcusx/src/content/docs/buildersDocs.ts) | **Modo técnico** — SDK & API |
| [`platformDocs.ts`](../../arcusx/src/content/docs/platformDocs.ts) | Referencia técnica de producto (+ rail partner) |
| [`publicDocs.ts`](../../arcusx/src/content/docs/publicDocs.ts) | Home, nav (dos audiencias), FAQ, legal |

UI: [`arcusx/src/pages/docs/`](../../arcusx/src/pages/docs/)

El directorio monorepo `/docs` (VitePress, sprints, …) es **solo interno** para el equipo.

Ver [CPANEL_DEPLOY.md](./CPANEL_DEPLOY.md).
