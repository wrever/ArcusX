# ArcusX — Customer Acquisition Plan (CAP)

**Versión:** 1.2 · **Fecha:** 2026-08-21  
**Mercado primario:** Chile (Santiago) + leads crypto-aware LATAM  
**Producto (cómo se vende):** software de coordinación de trabajo + **escrow non-custodial** en USDC sobre Stellar · Marketplace `arcusx.pro` · Partner API `@arcusx/sdk`  
**Fee:** **2%** al liberar (cliente fondea nominal) — `getPlatformFee`  
**Regla de marca:** solo **escrow ArcusX** + Stellar USDC  

**Uso:** advisors / grants / partners.  
**Complementos:** [`EMPRESAS_BRIEF.md`](./EMPRESAS_BRIEF.md) · [`PLATFORM_OVERVIEW.md`](../sdk/PLATFORM_OVERVIEW.md)

---

## 0. Guardrails Chile (leer antes de vender)

En Chile las criptomonedas **no están reguladas como un sistema de pagos / banco tradicional**. ArcusX **no** es una entidad financiera autorizada por la CMF ni un emisor de documentos tributarios.

| ArcusX **SÍ** es | ArcusX **NO** es / **NO** promete |
|------------------|-----------------------------------|
| Software / infra técnica de escrow on-chain | Banco, PSP, casa de cambio regulada |
| Coordinación de encargos + retención en smart contract | Emisor de **boletas de honorarios** ni **facturas electrónicas** SII |
| Settlement en **USDC (Stellar)** entre wallets | Pago en **CLP** ni transferencia bancaria chilena |
| Non-custodial (usuario firma con su wallet) | Custodio de fondos ni “cuenta ArcusX con saldo” |
| Piloto / Testnet primero | Asesoría tributaria, laboral o legal |
| Fee de plataforma sobre liberación on-chain | Sustituto de contrato laboral / Código del Trabajo |

### Reglas duras de adquisición (obligatorias)

1. **No ofrecer boletas ni facturas** “por el pago en crypto”. Si preguntan: *“Eso lo resuelve cada parte con su contador; nosotros no emitimos documentos tributarios chilenos.”*  
2. **No vender como “reemplazo de transferencia bancaria regulada”.** Vender como **escrow técnico + coordinación de trabajo**.  
3. **No decir** que KYB = cumplimiento SII/CMF. KYB = verificación interna del producto.  
4. **No prometer** on-ramp/off-ramp CLP, cash-out a banco, ni fechas de “ya estamos regulados”.  
5. **Calificar fuera** a quien diga: *“Solo si me emiten boleta / factura por cada pago.”* → **No ICP.**  
6. **90 días = Testnet** (sin USDC real). Reduce superficie de riesgo mientras se valida fit. Mainnet = conversación aparte + disclaimer escrito.  
7. En demos: una frase fija — *“Esto no es consejo legal ni tributario; crypto en Chile tiene un marco en evolución; cada empresa/freelancer consulta a su asesor.”*  
8. Preferir leads **crypto-aware / internacionales / tech** sobre finanzas corporativas tradicionales que exijan papeles SII desde el día 1.

**Por qué el CAP prioriza Motor A (partners) y startups tech:** entienden wallets y no esperan que ArcusX sea su departamento de contabilidad.

---

## 1. Resumen ejecutivo

Dos motores (no mezclar en la misma llamada):

| Motor | Qué vendemos | Quién firma | Monetización |
|-------|--------------|-------------|--------------|
| **A — Partner (SDK)** | API: wallets + monto → escrow / link | App del partner | Take rate 2% on-chain |
| **B — Empresas / marketplace** | Encargos + escrow en `arcusx.pro` | Usuario con wallet | Mismo take rate |

**Meta 90 días (Chile, equipo chico, compliance-first):**  
**1–2 design partners** (A) + **2–3 pilotos empresa crypto-aware** (B), casi todo en **Testnet**.  
No optimizar por “empresas que necesitan boleta”.

**Contexto local:** el pago estándar Chile = transferencia CLP + boleta/factura. Eso **choca** con USDC. El CAP no pelea ese muro: busca el segmento que **ya tolera** crypto o quiere experimentar en Testnet sin exigir documentos tributarios a ArcusX.

---

## 2. ICP (filtrado por riesgo Chile)

### 2.1 Motor A — Partner (prioridad)

| Segmento | Por qué es más seguro | Señal |
|----------|----------------------|--------|
| SaaS / marketplace / awards con users propios | Ellos manejan su relación comercial; nosotros somos riel técnico | App + payouts |
| Agencias/product studios **crypto-friendly** | Entienden USDC; no piden boleta a ArcusX | Ya pagaron en crypto alguna vez |
| Comunidades / academias tech | Payouts a builders; menos burocracia SII en el pitch | Eventos, grants, hackathons |
| Startups ecosistema (Platanus, Start-Up Chile, etc.) **abiertas a piloto técnico** | Founder hands-on | Quieren demo Testnet |

**Must-have:**
- Disposición a **wallet Stellar (Freighter)** y **Testnet**  
- Aceptan que ArcusX **no emite boletas/facturas**  
- 1 persona técnica o founder que pruebe el flujo  

**No ICP (bloqueo inmediato):**
- “Necesitamos boleta/factura de ustedes por cada pago”  
- “Solo CLP a cuenta corriente chilena”  
- “¿Están inscritos en CMF / son entidad de pago?” → no vender como eso; si insisten en licencia financiera, **cerrar**  
- Quieren que ArcusX custodie plata o firme transacciones por ellos  
- RR.HH. buscando **reemplazar contrato laboral** con la plataforma (riesgo laboral)

### 2.2 Motor B — Empresas

| Prioridad | Perfil | Nota |
|-----------|--------|------|
| Alta | Startup / founder técnico crypto-aware | Piloto Testnet |
| Media | Agencia digital que ya usa USDT/USDC informal | Educar límites |
| Baja / evitar | Contabilidad corporativa “solo boleta electrónica” | No ICP |
| Alta | Fintech / web3 que ya opera crypto | Fit natural |

### 2.3 Supply (freelancers)

Solo freelancers que acepten cobro en **USDC a wallet** y sepan que **ArcusX no les emite boleta**.  
Si el freelancer exige boleta de honorarios *de ArcusX*, no es fit.

---

## 3. Mensajes seguros (Chile)

### Partner

> “Integra escrow USDC en Stellar: API key + wallets. Non-custodial: firman tus usuarios. Fee 2% al liberar. No emitimos boletas ni movemos CLP: somos software de escrow.”

### Empresa

> “Publicas un encargo, el dinero queda en escrow on-chain hasta que apruebas. Settlement en USDC. Partimos en Testnet. Documentos tributarios los gestiona cada parte por su lado — nosotros no emitimos boletas.”

### Freelancer

> “Cobras en USDC cuando el cliente aprueba. Fee ~2%. ArcusX no emite boleta de honorarios; eso es entre tú y tu contador / cliente según tu caso.”

### Frase anti-riesgo (siempre en demo)

> “ArcusX no es banco ni asesor tributario. Crypto en Chile no tiene el mismo marco que un pago bancario. Ustedes validan con su abogado/contador si el flujo les sirve.”

### Objeciones → respuesta corta

| Objeción | Respuesta |
|----------|-----------|
| “¿Me emiten boleta?” | **No.** No emitimos boletas ni facturas SII. |
| “¿Pago en pesos?” | Hoy **no**. Solo USDC on-chain. |
| “¿Están regulados?” | Somos **software** non-custodial sobre Stellar; no somos entidad de pago CMF. |
| “Nadie usa Freighter” | Por eso calificamos; sin wallet no hay piloto. |
| “¿Y los impuestos?” | Cada usuario/empresa con su asesor. Nosotros no asesoramos ni liquidamos impuestos. |

---

## 4. Canales (sin atraer el lead equivocado)

| Canal | Usar | Evitar |
|-------|------|--------|
| Warm intros a founders tech | Sí | Cold a gerentes de finanzas “solo facturan” |
| LinkedIn CTOs / product | Sí | Pitch “ahorra impuestos” / “evita boletas” (ilegal / peligroso) |
| Ecosistema Stellar / web3 Chile | Sí | Prometer “alternativa bancaria regulada” |
| Start-Up Chile / Platanus (piloto técnico) | Sí | Vender como solución contable |
| WhatsApp post-intro | Sí | Ads masivos “paga freelancers sin papeles” |

**Cadencia:** 5–8 contactos/semana Motor A · 6–8 Motor B · priorizar warm.  
**Copy prohibido:** “sin boleta”, “sin impuestos”, “fuera del SII”, “como banco pero crypto”.

---

## 5. Embudo y metas 90 días

Casi todo el embudo es **Testnet** (sin dinero real) → menos fricción regulatoria mientras se prueba producto.

| Etapa | Meta 90 días |
|-------|----------------|
| Leads ICP **ya filtrados** (aceptan no-boleta) | **15–20** |
| Sandbox keys | **5–8** |
| Activated (fund Testnet) | **2–3** |
| Design partners | **1–2** |
| Pilotos empresa (Testnet) | **2–3** |
| LOI mainnet | **0–1** solo si entienden disclaimers |

**KPI de calidad (más importante que volumen):**  
% de demos donde se dijo explícitamente *“no emitimos boletas / no somos banco”* = **100%**.

---

## 6. Plan 90 días (compliance-first)

### Días 0–30
1. CRM solo con leads que pasen filtro §2 (pregunta boleta/CLP en el primer mensaje).  
2. One-pager + demo con **disclaimer Chile** visible.  
3. 2 cupos design partner; contrato/terms: non-custodial, no documentos tributarios, Testnet.  
4. Emitir keys solo tras aceptar límites por escrito (email basta).

### Días 31–60
1. 2–3 activaciones Testnet con pantalla compartida.  
2. 2–3 pilotos empresa **crypto-aware**.  
3. Case draft sin claim legal/tributario.

### Días 61–90
1. Revisar: ¿algún lead pidió boleta y seguimos? → cortar.  
2. Mainnet solo con checklist + disclaimer firmado/aceptado.  
3. No escalar outreach a “empresas tradicionales” hasta tener postura legal externa (abogado) si se busca ese segmento.

---

## 7. Oferta comercial (sin promesas fiscales)

| Oferta | Incluye | No incluye |
|--------|---------|------------|
| Sandbox Testnet | Key, docs, soporte | Dinero real, boletas |
| Design partner | Hands-on técnico | Asesoría legal/tributaria, CLP |
| Mainnet (cuando exista) | Key live, fee 2% on-chain | Facturación SII, custodial, “pago sueldo” |
| Empresas | Portal + verificación producto | Empleo formal, boletas ArcusX |

Fee override / Founding: **solo por escrito**, sin canjear por “nosotros te hacemos la boleta”.

---

## 8. Playbooks (seguros)

### A — Partner / CTO

> Integramos escrow USDC non-custodial en Stellar (API key + wallets). Fee 2%. No emitimos boletas ni movemos CLP — somos capa técnica. ¿Sandbox Testnet 20 min?

### B — Agencia crypto-aware

> Si ya les acomoda USDC y quieren retener el pago hasta el OK, podemos mostrar escrow en Testnet. Importante: no reemplazamos boleta/factura bancaria; eso queda fuera de ArcusX.

### C — Aceleradora

> Cupos piloto técnico (Testnet) para 1–2 startups del portfolio abiertas a wallets. Sin claim tributario ni bancario.

---

## 9. Ownership

Founder = CAP + demos + filtro compliance en cada call.  
Sin “equipo legal interno”: ante duda tributaria/CMF → **no improvisar**; escalar a abogado externo antes de prometer.

---

## 10. Riesgos y mitigación

| Riesgo | Mitigación en el CAP |
|--------|----------------------|
| Pedido de boleta/factura | No ICP; respuesta §3; no “roadmap de boletas” como compromiso |
| Percepción de banco / PSP | Pitch = software + escrow Stellar; nunca “entidad de pago” |
| Laboral (reemplazar contrato) | No vender como “contrata sin contrato”; solo coordinación + escrow |
| Mainnet prematuro | 90 días Testnet-first |
| Marketing agresivo “sin papeles” | Copy prohibido §4 |
| Partner traspasa riesgo a ArcusX | Terms: partner responsable de su UX y de informar a sus users |

---

## 11. Entregables cuando pidan el CAP

1. Este doc (v1.2)  
2. CRM filtrado  
3. One-pager con disclaimer Chile  
4. Video Testnet  
5. Slide metas §5  

---

## 12. North star (post 90 días)

- Partners/empresas que **entienden** el modelo non-custodial USDC  
- Cero promesas tributarias incumplibles  
- Mainnet solo con ojos abiertos (legal externo si se escala a empresas tradicionales)

---

## Anexo — Checklist pre-demo (obligatorio)

- [ ] ¿El lead exige boleta/factura de ArcusX? → **No avanzar**  
- [ ] ¿Exige solo CLP bancario? → **No avanzar**  
- [ ] ¿Acepta Testnet + Freighter? → Si no, educar una vez; si insiste no, **No ICP**  
- [ ] ¿Dijimos non-custodial + no somos banco + no asesoramos impuestos? → **Sí antes del CTA**  
- [ ] ¿Pedimos que consulten a su contador/abogado? → **Sí**

---

*Documento vivo. Prioridad: evitar problemas legales/tributarios en Chile por sobre volumen de leads. Fee = API. Sin boletas. Sin CLP. Sin claim de regulación financiera.*
