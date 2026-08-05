# ArcusX docs site (`docs.arcusx.pro`)

VitePress site. **Content + config:** `/docs` (+ `/docs/.vitepress`).  
**Build output:** `sites/docs/dist/` · **Static assets / .htaccess:** `sites/docs/public/`

## Develop

```bash
cd docs
npm install
npm run dev
```

## Build & deploy

```bash
cd docs
npm run build
# → sites/docs/dist/
# Upload dist/ contents to docs.arcusx.pro web root
```

Then point/keep DNS `docs.arcusx.pro` on that host and retire GitBook custom domain when ready.

Internal markdown (`archive/`, `sprints/`, plans, etc.) is excluded in `docs/.vitepress/config.mts`.

**Public copy rule:** never name third-party escrow vendors. Use **ArcusX Escrow** / USDC on Stellar only.
