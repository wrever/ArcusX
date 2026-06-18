# E2E Testnet — Checklist de cierre Tranche 2

Script narrativo: [`E2E_TESTNET.md`](./E2E_TESTNET.md) (8–12 min).  
Marcar aquí tras ejecutar en **prod** o **localhost** con Freighter testnet.

**Fecha ejecución:** 2026-05-28  
**Ejecutor:** equipo ArcusX  
**Entorno:** ☑ prod `arcusx.pro` (testnet)  
**Cierre Tranche 2:** ✅ — demo grabado: marketplace + ofertas privadas + deals

---

## Pre-requisitos

- [ ] Freighter en **Stellar Testnet**
- [ ] USDC testnet + trustline
- [ ] Dos cuentas (cliente + freelancer) o dos navegadores
- [ ] Build con `VITE_SUPABASE_URL` (sin `VITE_USE_PHP_API`)

---

## Flujo principal

| # | Paso | OK | Notas |
|---|------|----|-------|
| 1 | Landing: stats vivos (Edge/RPC) | ☐ | |
| 2 | OAuth → dashboard | ☐ | |
| 3 | Cliente: crear tarea USDC | ☐ | |
| 4 | Freelancer: aplicar + wallet verificada | ☐ | |
| 5 | Cliente: seleccionar propuesta + escrow TW | ☐ | contractId en tarea |
| 6 | Freelancer: evidencia milestone (archivo o texto) | ☐ | Tranche 2 nuevo |
| 7 | Freelancer: notificar entrega | ☐ | |
| 8 | Cliente: ver evidencia + liberar pago | ☐ | Stellar Expert tx |
| 9 | Notificación in-app (y email si aplica) | ☐ | |
| 10 | Chat SuperviseTask (Realtime o refresh) | ☐ | |
| 10b | Perfil: iconos badge + Configuración → Badges (`get_my_badges`) | ☐ | Listado freelancers/Hero muestra `public_badges` |

---

## Opcionales (si hay tiempo)

| # | Paso | OK |
|---|------|----|
| 11 | Deal: crear link → aceptar | ☐ |
| 12 | Oferta privada fondeada | ☐ |
| 13 | Admin → pestaña **Actividad** (`domain_events`) | ☐ |
| 14 | Referido: landing `?ref=` → bind | ☐ |

---

## Criterios de éxito (Tranche 2)

- [ ] Sin 401 en create/apply con JWT válido
- [ ] Escrow `contractId` persistido
- [ ] Freelancer recibe USDC según fee 3%
- [ ] Network: **0** requests a `arcusx.pro/api/*.php` en flujo 1–8
- [ ] Evento `task.evidence_submitted` visible en Admin Actividad (si se subió evidencia)

---

## Evidencia para revisores

- [ ] Link Stellar Expert (fund + release)
- [ ] Captura Network tab (solo `supabase.co/functions/v1`)
- [ ] Video o GIF ≤12 min (opcional)

---

*Tranche 2 — cierre de confianza operativa.*
