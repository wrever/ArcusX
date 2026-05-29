# Week 4 — Light theme: estado y gaps explícitos

**Alcance PLAN_MES1:** Hero, EditProfile, SuperviseTask, ProposalReview, UserProfile, ApplyTask, CreateTask, WalletConnectPopup.

## Hecho en repo (verificado por `[data-theme="light"]` en CSS)

| Archivo | Overrides light | Notas |
|---------|-----------------|-------|
| `Hero.css` | Sí (~50 reglas) | Roadmap, loading búsqueda |
| `EditProfile.css` | Sí (~41) | Formulario perfil / wallet |
| `SuperviseTask.css` | Sí (~27) + bloque reciente | Blockchain status, modales |
| `ProposalReview.css` | Sí (~100) | Confirmación, escrow process popup |
| `UserProfile.css` | Sí (~35) | Preloader, cards |
| `ApplyTask.css` | Sí (~18) | Wallet paste, back button |
| `CreateTask.css` | Sí (~65) | Form, límites |
| `WalletConnectPopup.css` | Sí (~26) | Descarga wallet, CTAs |

**Capas globales:** `light-theme-global.css`, `dashboard-light.css`, `auth-surfaces-light.css`, `light-theme-remaining.css`, `light-theme-contrast.css` (`main.tsx`).

## Gaps conocidos (no bloquean E2E testnet)

| Área | Gap | Severidad | Acción sugerida |
|------|-----|-----------|-----------------|
| `SwapPage` / `SwapCard` | Switch y cards parciales; no revisión exhaustiva | Baja | Siguiente ciclo |
| Admin panel | Subsecciones densas (disputas timeline) — `light-theme-remaining` cubre núcleo | Media | QA visual admin |
| `EmpresasPage` | Tema forzado claro en host enterprise; distinto de `data-theme` | Info | Por diseño |
| Tablas dashboard (stats chart) | Scroll horizontal intencional en gráfico | Baja | `responsive-critical.css` acota min-width en 480px |
| Inline styles residuales | Algunos `style={{}}` en disputas/admin stats | Baja | Migrar a variables CSS |

## Smoke manual (light) — rutas críticas

1. `/` Hero + wallet navbar  
2. `/dashboard` + `/dashboard/settings`  
3. `/create-task`, `/apply-task/:id`  
4. `/proposals/:id` (aceptar + popup escrow)  
5. Supervise task + blockchain card  
6. `/profile/:id`  
7. Wallet connect popup  

**Criterio pass:** texto legible, CTAs con contraste ≥4.5:1, sin texto blanco sobre blanco, bordes visibles en cards.

---

*2026-05-28 — Week 4 technical close*
