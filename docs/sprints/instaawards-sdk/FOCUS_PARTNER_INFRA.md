# Instawards — Focus realineado: Partner Infra (Escrow + Deals)

**Track:** `@arcusx/sdk` · SOW 2  
**Fecha:** 2026-08-18  
**Cambio de énfasis:** el entregable sigue siendo SDK + Testnet; el **story** al revisor pasa de “marketplace JWT / award” a **“infra de escrow + payment links para apps terceras”**.

Tesis: [`docs/sdk/INFRA_THESIS.md`](../../sdk/INFRA_THESIS.md)

---

## Pitch de 15 segundos (revisor)

> ArcusX es infraestructura de escrow USDC + payment links para apps terceras. Un integrador usa API key + wallets; nosotros cobramos fee. Sin login ArcusX.

---

## Mapa semanas (qué ya sirve / qué empujar)

### Week 1 — Base partner ✅
- Contrato tipado, gateway `api.arcusx.pro`, auth valid/invalid  
- `public.*` + envelope + smoke  
**Evidencia:** `npm run smoke:strict` · `demo:week1` · packet W1

### Week 2 — Superficie de trabajo (reencuadre)
- **Mantener** award-style como *escenario de validación* (SOW lo pide)  
- **Enfatizar** en changelog: quote + API key + examples que no asumen app ArcusX  
- Gap honesto: create task JWT ≠ partner rail (eso es W3/W4 partner*)

### Week 3 — Motor escrow partner (prioridad ahora)
- `partnerEscrow.*` (API key + wallets + amount) — **código listo, deploy pendiente**  
- local-test suite + tab Partner escrow  
- Webhooks HMAC  
- Task-JWT escrow queda como path de **arcusx.pro**, no del pitch B2B  
**Packet:** actualizar W3 changelog con este foco · [`PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md)

### Week 4 — Deals + release
- `partnerDeals.*` (links de pago)  
- Release package, known limitations, demo E2E partner  
- Mainnet checklist solo doc  
**Spec:** [`PARTNER_DEALS.md`](../../sdk/PARTNER_DEALS.md)

---

## Checklist “¿estamos alineados?”

| Pregunta | Respuesta objetivo |
|----------|-------------------|
| ¿El partner necesita JWT ArcusX para escrow? | **No** |
| ¿Quién firma? | Wallet en la app del partner |
| ¿Dónde está TW? | Solo Edge ArcusX |
| ¿Cómo ganamos? | Fee en cada escrow/deal |
| ¿Deals es opcional? | No — es pilar de producto |
| ¿Board de tasks? | Bonus distribución, no el core |

---

## Próximos pasos de construcción (sin deploy)

1. Congelar tesis + specs (este packet + INFRA / PARTNER_*)  
2. SDK stubs + ejemplos Node partner escrow/deal (offline-ready)  
3. local-test tabs: Escrow + Deals  
4. Cuando haya Supabase ArcusX: migración + Edge + smoke live  
5. Notion changelogs W3/W4 con el pitch nuevo  

**No** priorizar más flujos JWT de marketplace salvo que el SOW lo exija explícitamente como evidencia award.
