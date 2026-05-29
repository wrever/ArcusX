# ArcusX Deals — Acuerdos modulares

**Carpeta de planificación** para transformar el contrato/escrow en **plantillas por categoría** (alquiler, auto P2P, coaching, reparaciones, freelance, etc.) con **link de pago** que la contraparte acepta y fondea.

> **Idea:** mismo motor que el marketplace (escrow USDC + liberación condicionada), **UX distinta** — wizard guiado + “Review & Send”, sin postular a una tarea pública.

## ¿Encaja con la visión?

**Sí** — ver [VISION_FIT.md](./VISION_FIT.md). Es expansión del **Work Execution Layer**, no un pivot.

## Documentación

| Archivo | Contenido |
|---------|-----------|
| **[VISION_FIT.md](./VISION_FIT.md)** | Por qué sí/no, riesgos, relación con Guard y agentes |
| **[PRODUCT_SPEC.md](./PRODUCT_SPEC.md)** | Flujo UX (pago único, milestones, wizard, link) |
| **[TEMPLATES_CATALOG.md](./TEMPLATES_CATALOG.md)** | Categorías, textos prefill, reglas por plantilla |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Modelo de datos, roles, escrow, Supabase |
| **[PLAN.md](./PLAN.md)** | Fases de implementación |
| **[CHECKLIST.md](./CHECKLIST.md)** | Gates |

## Relación con el monorepo

```
docs/agreement-deals/     ← este feature (UI + links)
docs/escrow-native/      ← mismo motor on-chain
docs/agentic-payments/   ← API futura para acuerdos programáticos
docs/agentic-payments/arcusx-guard/  ← protección en chat del acuerdo
arcusx/                  ← nueva ruta app: /deals o /agreements
```

**Nombre comercial sugerido:** **ArcusX Deals** (acuerdo directo) vs **ArcusX Tasks** (marketplace).

---

*ArcusX · Mayo 2026*
