# ArcusX — Customer Acquisition Plan (CAP)

**Versión:** 1.1 · **Fecha:** 2026-08-21  
**Mercado primario:** Chile (Santiago + remoto LATAM)  
**Producto:** Escrow USDC + payment links sobre Stellar · Marketplace `arcusx.pro` · Partner API `@arcusx/sdk`  
**Fee público:** **2%** al worker (cliente fondea el nominal) — confirmar siempre con `getPlatformFee`  
**Regla de marca:** solo **escrow ArcusX** + Stellar USDC (no nombrar el motor on-chain interno)

**Uso:** entregar a advisors / grants / partners que pidan cómo se van a conseguir clientes.  
**Complementos:** [`EMPRESAS_BRIEF.md`](./EMPRESAS_BRIEF.md) · [`PLATFORM_OVERVIEW.md`](../sdk/PLATFORM_OVERVIEW.md)

---

## 1. Resumen ejecutivo

ArcusX vende por **dos motores** (no mezclar el pitch en la misma llamada):

| Motor | Qué | Quién paga / firma | Monetización |
|-------|-----|--------------------|--------------|
| **A — Partner (SDK)** | API key + wallets → escrow / link de pago | App del partner | Take rate 2% sobre GMV liberado |
| **B — Empresas / marketplace** | Encargos con escrow en `arcusx.pro` | Empresa / cliente | Mismo take rate |

**Prioridad 90 días (realista, Chile, equipo chico):**  
**1–2 design partners** (Motor A) + **2–4 empresas/agencias en piloto** (Motor B).  
Supply de freelancers = liquidez del board, no el KPI de “cliente de pago”.

**Contexto Chile:** la mayoría de agencias y startups pagan por transferencia CLP / factura. USDC + Freighter es **educación + onboarding**, no un “plug and play” masivo. Por eso el CAP prioriza pocos partners con soporte hands-on, no volumen de outreach vacío.

---

## 2. ICP (Chile primero)

### 2.1 Motor A — Partner

**Ideal:** producto digital chileno o regional que **ya** coordina trabajo entre pagador y ejecutor (marketplace, academia, awards, SaaS de servicios, agencia con portal propio).

| Segmento | Por qué encaja en Chile | Señal |
|----------|-------------------------|--------|
| Agencias / studios (web, product) | Subcontratan mucho; márgenes sensibles a Workana/Upwork | Publican “buscamos freelance” o tienen red fija |
| SaaS / productos con freelancers en el flujo | Quieren retener UX y cobrar/pagar sin armar escrow | Tienen app + usuarios |
| Academias / awards / communities tech | Pagan mentors, jurados, builders | Eventos + payouts recurrentes |
| Startups del ecosistema (Start-Up Chile, Platanus, etc.) | Necesitan features sin headcount | Portfolio activo |

**Must-have (ajustado a Chile):**
- Al menos **1–3 pagos a terceros al mes** (aunque sean $300–2.000 USD) o plan claro de empezar  
- Alguien técnico o founder hands-on que pueda probar Freighter en Testnet  
- Disposición a piloto en **Testnet** (mainnet = fase siguiente)

**No ICP ahora:**
- Solo quieren contrato laboral / boleta de honorarios sin crypto  
- Exigen CLP in/out nativo día 1 (on-ramp = roadmap; no prometer)  
- Piden que ArcusX custodie fondos o firme por ellos

### 2.2 Motor B — Empresas compradoras

| Segmento Chile | Dolor típico | Oferta |
|----------------|--------------|--------|
| Startup early (pre-seed / seed) | Dev o diseño por feature | Tarea + escrow |
| Agencia digital | Subcontrato + riesgo de entrega | Escrow + fee 2% |
| Founder no técnico | Miedo a pagar y no recibir | Dinero retenido hasta OK |
| Fintech / crypto-aware | Ya hablan USDC | Settlement Stellar |

### 2.3 Supply (freelancers)

Devs y diseñadores Chile / LATAM vía LinkedIn, WhatsApp, contenido y board.  
**KPI:** propuestas por tarea y tiempo a primera propuesta — no GMV.

---

## 3. Mensajes (español Chile — tuteo)

### Partner

> “Integra escrow USDC y links de pago en tu app: API key + wallets. Tus usuarios no crean cuenta ArcusX. Cobramos 2% al liberar.”

### Empresa

> “Publica el encargo, elige propuesta, el dinero queda en escrow hasta que apruebes. Tú fondeas el monto acordado; el worker recibe ~98%.”

### Freelancer

> “Misma calidad de trabajo, menos comisión que marketplaces clásicos; cobras en USDC cuando el cliente aprueba.”

**Objeción local (preparada):** *“En Chile nadie usa Freighter.”*  
→ Piloto con onboarding guiado (15–20 min). Primero Testnet. Si no hay wallet, no es lead calificado aún.

---

## 4. Canales (Chile)

### 4.1 Motor A

| Canal | Acción | Cadencia realista |
|-------|--------|-------------------|
| **Warm + LinkedIn** | 15–25 ICPs Chile (agencias, SaaS, portfolio aceleradoras) | **5–8** contactos/semana |
| **WhatsApp / intro** | Pedir intro a founders conocidos, advisors, inversores | Continuo |
| **Design partner** | **2 slots** máximo: key, Telegram, call quincenal | Cerrar en 45–60 días |
| **Ecosistema** | Start-Up Chile / Platanus / meetups Santiago / Stellar LATAM | 1 demo o cafe/mes |
| **Docs + demo corta** | Video 3 min Testnet + `docs.arcusx.pro` | 1 mejora/mes |
| **SOW / Instawards** | Evidencia técnica del rail (si aplica al reviewer) | Según ciclo |

### 4.2 Motor B

| Canal | Acción | Cadencia |
|-------|--------|----------|
| Outbound LinkedIn + email | Plantillas del brief Empresas | **8–10**/semana en sprint (no 15+) |
| Portal `empresas.*` | Form demo / KYB | Siempre on |
| Intros warm | 1–2 por mes desde red personal | Continuo |
| 1-pager PDF | Agencia / startup / link de pago | Pack listo |

**No depender de:** ads pagos masivos, cold email USA, o “40 CTOs LATAM en 30 días” sin red.

---

## 5. Embudo y metas 90 días (creíbles)

### Motor A

```
Aware → Interesado (pide key) → Activated (≥1 fund Testnet)
  → Design partner (call recurrente) → Intent mainnet / LOI
```

| Etapa | Meta 90 días | Por qué así |
|-------|--------------|-------------|
| Leads ICP en CRM | **20–25** (Chile + 5–10 LATAM) | Lista manejable a mano |
| Sandbox keys | **6–10** | No todas activan |
| Activated (fund Testnet) | **2–3** | Hands-on; Freighter frena |
| Design partners | **1–2** | Soporte realista con 1 founder |
| GMV Testnet | **$500–2.000** USDC demo | Prueba, no revenue |
| LOI / intent mainnet | **0–1** | Bonus; no KPI obligatorio |

### Motor B

| Etapa | Meta 90 días |
|-------|----------------|
| Conversaciones / demos cortas | **10–15** |
| Pilotos con ≥1 flujo completo (testnet o staging) | **2–4** |
| Segundo encargo (retención señal) | **1–2** |

### Norte compartido

| KPI | Meta 90 días |
|-----|----------------|
| Partners/empresas con ciclo real documentado | **3+** en total (A+B) |
| Time-to-first-escrow (con soporte) | **&lt; 14 días** (no 7: Chile + wallet) |
| Fee entendido en demo | 100% |

*No prometer GMV mainnet ni revenue en CLP en este horizonte.*

---

## 6. Plan 90 días

### Días 0–30 — Base Chile

1. CRM: **20–25** leads Motor A + **20** Motor B (Sheet). Priorizar warm.  
2. Pack: 1-pager partner + 1-pager empresas + video Testnet 3 min.  
3. Abrir **2** cupos design partner (no 3–5).  
4. 1 demo pública o grabada (ecosistema / SOW).  
5. Emitir **4–6** sandbox keys a leads que ya respondieron.

### Días 31–60 — Activación

1. Llevar **2–3** a fund en Testnet (sesión compartida pantalla).  
2. Cerrar **1–2** design partners con call **quincenal** (semanal satura).  
3. **6–8** demos empresa → **2–3** pilotos.  
4. Un case draft anónimo (agencia o startup chilena).

### Días 61–90 — Cierre suave

1. Revisar qué canal funcionó (warm vs cold); cortar cold si no convierte.  
2. Checklist mainnet (doc) solo a quien ya activó Testnet.  
3. Meta: **1–2 design partners** + **2–4 pilotos empresa** documentados.  
4. LOI solo si hay tracción real — no forzar papel vacío.

---

## 7. Oferta comercial

| Oferta | Incluye | Fee |
|--------|---------|-----|
| Sandbox | Key testnet, docs, examples | Gratis |
| Design partner | Soporte, priorización bugs | **2%** estándar; override solo post-piloto y por escrito |
| Production (mainnet) | Key live, webhooks | **2%** sobre GMV liberado |
| Empresas | Portal + verificación + encargos | **2%**; volumen = conversación aparte |

**No vender ahora:** white-label, CLP nativo, multi-milestone enterprise custom.

**Founding / early (opcional):** práctica en Testnet ahora; beneficio mainnet (ej. meses a fee preferencial) **solo si** se documenta por escrito y no contradice el 2% público sin acuerdo.

---

## 8. Playbooks (cortos)

### A — CTO / founder producto

**Asunto:** Escrow USDC en tu app sin forzar login nuestro  

> Armamos infra de escrow + payment links en Stellar. Integración: API key + wallets. Tus users se quedan en tu producto; cobramos 2% al liberar.  
> ¿Te sirve un sandbox y 20 min con un ciclo Testnet en vivo?

### B — Agencia Santiago

**Asunto:** Subcontratos con plata retenida hasta el OK  

> Cuando subcontratan a un especialista, ¿el pago queda retenido hasta aprobar o es transferencia a ciegas?  
> ArcusX: escrow USDC, fee 2%. Demo 15 min (partimos en Testnet).

### C — Aceleradora / hub

**Asunto:** Escrow para 1–2 startups del portfolio  

> Ofrecemos 1–2 cupos design partner: SDK o portal Empresas, Testnet primero, soporte directo. Workshop 45 min + keys.

---

## 9. Ownership (equipo chico)

| Rol | Quién | Notas |
|-----|-------|--------|
| CAP / demos | Founder | ~60–70% del tiempo comercial |
| Unstick técnico | Founder / eng | Sesiones Freighter + key |
| Contenido | Founder | 1 post / 2 semanas basta |

Si hay **una sola persona:** no correr Motor A y B a full. Semanas pares = partners; impares = empresas — o 70/20/10 como tope.

---

## 10. Riesgos (Chile)

| Riesgo | Mitigación |
|--------|------------|
| Freighter / USDC frena | Calificar; onboarding guiado; Testnet primero |
| Quieren solo CLP / boleta | Honesto: crypto settlement hoy; fiat = roadmap |
| Metas infladas ante reviewers | Usar **este** CAP (1.1), no números “serie A” |
| Mainnet no listo | 90 días = Testnet + aprendizaje + LOI opcional |
| Confundir SDK con marketplace | Una historia por reunión |

---

## 11. Qué adjuntar cuando pidan el CAP

1. Este documento  
2. Sheet CRM (aunque tenga 20 filas)  
3. 1-pagers  
4. Link docs + video/screenshot ciclo Testnet  
5. Slide con metas §5 (versión 1.1)

---

## 12. North star (después de 90 días)

- 1–2 partners o empresas con intención clara de mainnet  
- Take rate 2% como línea de negocio entendible  
- Marketplace como vitrina; partners como multiplicador cuando haya capacidad

---

*Documento vivo. Fee = API. Mercado primario = Chile. Sin promesas de volumen que el equipo no puede soportar.*
