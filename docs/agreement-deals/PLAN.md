# Plan — ArcusX Deals

Depende de escrow estable y Supabase backend (misma línea que agentic payments).

---

## Fase 0 — Planificación ✅

- [x] Carpeta `docs/agreement-deals/`
- [ ] Validar 3 plantillas prioritarias con usuarios (rental, car, coaching)
- [ ] Copy legal disclaimer

---

## Fase 1 — MVP wizard + link (8–10 sem)

| # | Entregable |
|---|------------|
| 1.1 | Migración `arcusx_agreements` |
| 1.2 | UI wizard 5 pasos (ES + EN) |
| 1.3 | `deal_token` + página pública `/deal/:token` |
| 1.4 | Accept + fund (reutilizar escrow flow) |
| 1.5 | 3 plantillas: freelancer, rental, other |
| 1.6 | Review & Send + copy link |
| 1.7 | E2E testnet: crear → link → accept → fund |

---

## Fase 2 — Milestones + más plantillas (6 sem)

- Milestone UI + multi-release
- car_sale, coaching, home_repair
- Notificaciones in-app
- Guard en chat acuerdo

---

## Fase 3 — Growth (6+ sem)

- Fiat hint / anchor partner
- API `POST /v1/agreements`
- Empresas subdomain embed
- Renta mensual recurrente (plantilla rental v2)

---

## Prioridad vs otros tracks

| Track | Prioridad relativa |
|-------|-------------------|
| escrow-native S1 | **Bloqueante** |
| ArcusX Guard P1 | Paralelo (chat deals) |
| Agentic API | Después MVP deals |
| **Deals MVP** | Alto GTM — link viral |

---

*Checklist:* [CHECKLIST.md](./CHECKLIST.md)
