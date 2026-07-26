# ArcusX Empresas — Brief comercial completo (para outreach B2B)

**Uso:** Copiar este documento a Claude u otro agente para conseguir clientes que quieran **pagar por el portal Empresas** — startups, agencias y SaaS que contratan freelancers en LATAM.

**Contacto producto:** Bruno Andrés · ArcusX · https://arcusx.pro · Portal B2B: https://arcusx.pro/empresas (subdominio dedicado `empresas.*`)

**Estado mayo 2026:** Producto funcional en **Stellar testnet**; piloto B2B con onboarding manual. Mainnet = próximo hito para GMV real. **No prometer** features no listadas abajo.

---

## 1. Qué es ArcusX (una frase)

**ArcusX** es infraestructura de ejecución de trabajo con **escrow en USDC sobre Stellar**: publicás un encargo, elegís quién lo ejecuta, el dinero queda en smart contract hasta que aprobás la entrega, y el pago se liquida en segundos. No somos custodios del dinero — el contrato on-chain sí.

**ArcusX Empresas** es el portal B2B para equipos que contratan talento **por tarea** (no por “puesto”): CTOs, compras, finanzas y founders que necesitan devs/diseño/especialistas sin inflar plantilla ni armar contratos de 10 páginas por trabajos chicos.

---

## 2. Propuesta de valor para empresas

### El dolor que resuelven hoy

| Dolor | Cómo lo viven |
|-------|----------------|
| Comisiones altas | Upwork/Workana cobran **10–20%** |
| Pagos lentos | Transferencias, SWIFT, **7–30 días** |
| Sin garantía | PDFs, “te pago cuando pueda”, disputas informales |
| Burocracia | Contratar legalmente por una integración de 2 semanas no cierra |
| Cross-border | Agencias en Chile/Argentina/México pagan freelancers en varios países con fricción bancaria |

### Lo que ofrece ArcusX Empresas

| Beneficio | Detalle comercial |
|---------|-------------------|
| **Pagás por resultado** | Encargo acotado: hito, presupuesto, criterios de aceptación |
| **Escrow automático** | Fondos en smart contract hasta el OK del pagador |
| **USDC en Stellar** | Stablecoin; liquidación **~4 segundos** tras aprobar |
| **Non-custodial** | ArcusX no retiene fondos ni claves de wallet del cliente |
| **Comisión baja** | **4% total** estándar (vs 10–20% tradicionales); **empresas KYB: 2,5–3%** preferencial |
| **Huella auditable** | Tarea + liberaciones trazables on-chain |
| **Mismo motor que el marketplace** | Acceso a talento LATAM del mercado ArcusX |
| **KYB obligatorio (empresas)** | Solo empresas **verificadas** pueden publicar encargos, ofertas privadas y deals |

### Headline del landing (copy aprobado)

- **Título:** *Contrata talento por tarea. Sin contratar de más.*
- **Subtítulo:** *Para una tarea simple no necesitas contratar a alguien ni gastar en contratos y trámites: publicá el encargo, elegí propuesta y pagá en USDC solo cuando aprobás la entrega.*

### Tres pilares (venta)

1. **Pagás por resultado, no por “puesto”** — talento sin rol interno permanente.
2. **Dinero retenido hasta tu OK** — escrow entre tu equipo y el ejecutor.
3. **Un portal para quien decide** — visibilidad para compras, finanzas y aprobaciones.

### Casos de uso (dónde encaja)

| Área | Ejemplo |
|------|---------|
| **Talento / supply** | Integración API fase 2, feature puntual, auditoría smart contract |
| **Procurement** | Alcance, plazo y criterios de aceptación antes de mover dinero |
| **Finanzas / tesorería** | USDC retenido hasta aprobación; salida de caja predecible |
| **Compliance** | Registro on-chain para justificar gasto en auditoría |

### Flujo en 3 pasos (demo)

1. **Publicás el encargo** — tarea, presupuesto USDC, quién aprueba en la empresa.
2. **Ejecución + escrow** — el talento entrega; el pago sigue bloqueado.
3. **Aprobás y se liquida** — USDC al wallet del ejecutor on-chain.

---

## 3. Comparativa competitiva (usar en calls)

| | Upwork / Workana | ArcusX Empresas |
|--|------------------|-----------------|
| Comisión total | 10–20% | **4%** estándar · **2,5–3%** empresa KYB verificada |
| Custodia | Plataforma retiene | **Smart contract** |
| Tiempo de pago | Días / semanas | **~4 segundos** (Stellar) |
| Moneda | Fiat + fees FX | **USDC** |
| Garantía | Política de la plataforma | **Código on-chain** |
| Onboarding | KYC bancario pesado | **OAuth (Google/GitHub) + wallet** |

**Posicionamiento:** No somos “Upwork Web3”. Somos **ejecución de trabajo + cobro condicionado** para equipos que ya contratan freelancers y están cansados de comisiones y demoras.

---

## 4. Pricing y comisiones (modelo real — importante para ventas)

### Comisión total ArcusX: **4%** (estándar)

ArcusX cobra **4% en total** sobre el flujo de fondeo/liberación (modelo bilateral en UI):

| Componente | % | Notas |
|------------|---|--------|
| **Total on-chain** | **4%** | Lo que paga el ecosistema en el escrow |
| ArcusX (plataforma) | ~3,7% | `platformAddress` — nuestra comisión |
| Protocolo escrow | ~0,3% | Motor contrato (oculto al cliente) |

**UX bilateral (lo que ve el usuario):**
- Cliente: nominal + **2%** visible al fondear
- Trabajador: neto ≈ nominal × 0,96 (**4%** total descontado on-chain)

**Ejemplo estándar (1.000 USDC nominal):**
- Cliente fondea ~1.020 USDC
- Trabajador recibe ~960 USDC neto
- **~40 USDC** de comisión total (4% del flujo)

### Empresas verificadas (KYB): fee **más bajo** — estrategia comercial

**Principio:** Las empresas son el cliente que cuidamos. Fee preferencial solo con **KYB aprobado** (empresa real, no cuenta personal disfrazada).

| Tier | Comisión total | Quién califica |
|------|----------------|----------------|
| Marketplace público (individual) | **4%** | Cualquier usuario |
| **Empresa KYB verificada** | **3%** (piloto) | KYB aprobado + `account_type: enterprise` |
| **Enterprise contrato** | **2,5%** negociado | Volumen recurrente (ej. >$5K USDC/mes) + contrato anual |

*La reducción sale del margen ArcusX, no del protocolo (~0,3% fijo).*

**Pitch financiero (usar 3% empresa en demos):**

| Volumen mensual freelancers | Upwork ~15% | ArcusX estándar 4% | **ArcusX empresa 3%** |
|----------------------------|-------------|---------------------|------------------------|
| $5.000 | $750 | $200 | **$150** |
| $10.000 | $1.500 | $400 | **$300** |
| $50.000 | $7.500 | $2.000 | **$1.500** |

**Mensaje venta:** *“Verificamos que sos empresa real (KYB). A cambio, fee preferencial y soporte prioritario.”*

### Otros ingresos enterprise (complementarios)

| Concepto | Rango sugerido |
|----------|----------------|
| Plan Enterprise SaaS | **$500–2.000+/mes** (SSO, SLA disputas — roadmap) |
| KYB / verificación | Incluido en onboarding piloto; luego setup opcional |
| Piloto onboarding B2B | Fee único consultoría |
| Embed API / SDK partner | Tier por volumen GMV |

---

## 5. Tracción y credibilidad

| Dato | Valor |
|------|-------|
| Usuarios registrados | **~260** (100% orgánico, $0 ad spend) |
| Red actual | Stellar **testnet** (mainnet en roadmap) |
| Auth | Google + GitHub (Supabase OAuth) |
| Wallet | Freighter (Stellar) |
| Ecosistema | Stellar, USDC, Soroswap (swaps), escrow vía infra ArcusX |
| Productos hermanos | **CertiX** (certificaciones verificables on-chain) — funnel confianza |

**Frase de tracción:** *“260 developers en testnet sin publicidad. Si esto es el piloto, el mainnet es donde empieza el GMV real.”*

---

## 6. ICP — Cliente ideal (quién pagaría Empresas)

### Debe cumplir (al menos 2)

- Contrata **freelancers recurrentemente** (devs, diseño, datos, marketing técnico).
- Presupuesto tech limitado o márgenes ajustados (startups seed/Series A).
- Dolor real en **pagos internacionales** o disputas con contratistas.
- Decision maker con afinidad tech (CTO, Head of Eng, COO, founder técnico o semi-técnico).
- Operación **LATAM** (Chile, Argentina, México, Colombia, Perú prioritario).

### Segmentos prioritarios

| Segmento | Por qué compran | Dolor #1 |
|----------|-----------------|----------|
| **Startups tech** (15–80 personas) | Escala rápida con contratistas | Contratos + pagos lentos |
| **Agencias digitales** | 5–15 freelancers por proyecto | Excel de pagos + cross-border |
| **SaaS en crecimiento** | Features puntuales sin headcount | Flujo de caja impredecible |
| **Fintechs LATAM** | Entienden blockchain/USDC | Misma infra que ya confían |
| **Consultoras nearshore** | Devs en 3+ países | Unificar contrato/pago |

### Anti-ICP (no perder tiempo)

- Empresas que **nunca** pagarían en crypto/USDC (solo fiat local, cero apertura).
- Procurement enterprise con 12 meses de vendor onboarding (Fortune 500 clásico).
- Quien busca **nómina / EOR** — no somos Deel; somos **tarea + escrow**.

---

## 7. KYB obligatorio — política de acceso Empresas

### Regla de negocio (objetivo producto)

**En portal Empresas, sin KYB aprobado NO se puede:**
- Publicar tareas / encargos (`create_task`)
- Crear ofertas privadas 1:1
- Crear deals por link (`create_deal`)

**Sí se puede sin KYB:** entrar con OAuth, explorar mercado, completar formulario KYB, conectar wallet, **aplicar a tareas como ejecutor** (si aplica).

### Por qué (mensaje comercial)

- Filtra quien entró al portal “a ver si puede postear” sin ser empresa real.
- Protege freelancers: solo publican clientes con razón social verificada.
- Habilita fee preferencial y badge **Empresa verificada** en listados.
- Alinea compliance B2B (auditoría, procurement).

### Estado técnico (honestidad para el agente)

| Pieza | Estado |
|-------|--------|
| Flujo KYB submit + admin approve | ✅ Construido |
| API `can_publish_as_enterprise` en `get_verification_status` | ✅ Existe |
| Badge en listados `creator_verified_enterprise` | ✅ Construido |
| **Bloqueo backend** en `create_task` / `create_deal` / ofertas privadas | 🔲 **Pendiente — prioridad alta** |
| **Bloqueo frontend** (CreateTask, DealWizard deshabilitados) | 🔲 **Pendiente** |

**En outreach:** vendé la política como **ya decidida**; el piloto incluye KYB en las primeras 48 h. No digas que “cualquiera postea hoy sin verificar” — decí: *“activamos tu cuenta de publicación tras KYB (24–72 h)”*.

---

## 8. Programa Early Adopter Empresas (gancho principal de cierre)

**Nombre comercial:** *ArcusX Empresas — Founding Partner* (o *Early Adopter Enterprise*)

**Objetivo:** Onboarding en **testnet** hoy (flujo sin riesgo); al **pasar a mainnet**, las Founding Partners tienen **2 meses sin comisión ArcusX** para probar con USDC real.

### Fases del programa

| Fase | Qué pasa | Comisión |
|------|----------|----------|
| **1 — Piloto testnet** (ahora) | KYB, onboarding, primeros encargos con USDC de prueba, validar flujo | Sin GMV real; aprenden la plataforma |
| **2 — Mainnet** (cuando la empresa activa) | **Arranca el beneficio:** **0% comisión ArcusX × 2 meses** en liberaciones con USDC real | Reloj desde primera liberación mainnet o fecha acordada de go-live |
| **3 — Post-promo** (mes 3+) | Fee empresa **3%**; **2,5%** con volumen recurrente | Tarifa preferencial vs 4% estándar |

### Beneficios confirmados (ofrecer ya en outreach)

| Beneficio | Detalle |
|-----------|---------|
| **0% comisión ArcusX × 2 meses en mainnet** | **Solo al activar mainnet** — para que prueben con USDC real sin fee de plataforma. No cuenta el periodo testnet. |
| **Badge Early Adopter / Founding Partner** | Visible en listados junto a “Empresa verificada”. |
| **KYB express** | Cola prioritaria 24–72 h (habilita publicar en testnet y queda listo para mainnet). |
| **Línea directa founders** | Slack / WhatsApp — onboarding testnet hoy, acompañamiento al switch mainnet. |
| **Onboarding white-glove** | Testnet: aprender flujo. Mainnet: primer encargo real acompañado. |

### Beneficios en planificación (mencionar como “incluidos si cerrás en la ventana”)

| Beneficio | Estado | Notas |
|-----------|--------|-------|
| Tarifa bloqueada post-promo | 🔲 Definir | Ej. **2,5%** por 12 meses tras los 2 meses al 0% (vs 4% estándar). |
| Logo / caso de estudio en `empresas.*` | 🔲 Definir | Con consentimiento; solo 5–10 logos “Founding”. |
| Acceso anticipado SDK / embed | 🔲 Roadmap | Partner técnico si quieren integrar en su producto. |
| Disputa express (SLA 48 h) | 🔲 Roadmap | Primeros pilotos gratis. |
| Límite de cupos | 🔲 Definir | Sugerencia: **primeras 10–15 empresas** KYB aprobadas en la ventana. |

### Reglas del programa (para Claude — no inventar más)

1. **Testnet hoy** = capacitación y validación operativa (sin USDC real). **El 0% × 2 meses empieza en mainnet**, cuando sí hay dinero en juego.
2. **0% = comisión ArcusX** (~3,7% del stack). El protocolo escrow (~0,3%) puede aplicar en mainnet — ser transparentes si preguntan.
3. Requiere **KYB aprobado** antes de publicar.
4. Tras 2 meses en mainnet: fee **3%** empresa; **2,5%** con volumen.
5. Early adopter ≠ forever free — ventana de adopción al go-live mainnet.

### Mensaje one-liner

> *“Entrená en testnet hoy con KYB y soporte directo. Cuando pasen a **mainnet**, las Founding Partners tienen **2 meses sin comisión ArcusX** para probar con USDC real.”*

---

## 9. Oferta de piloto (lo que ofrecer para cerrar el primer pago)

**Paquete Founding Partner — dos fases:**

**Fase A — Testnet (ahora)**
1. Inscripción Founding Partner (cupos limitados, ej. 10–15).
2. KYB express 24–72 h → publicación habilitada.
3. Onboarding + 1–3 encargos en testnet (flujo completo sin USDC real).
4. Badge Early Adopter activo en listados.

**Fase B — Mainnet (go-live)**
5. **0% comisión ArcusX durante 2 meses** desde activación mainnet (USDC real).
6. Soporte founders en primer fondeo y liberación real.
7. Mes 3+ mainnet: **3%** empresa; **2,5%** con volumen (ej. $5K USDC/mes).

**CTA:** *“20 min demo → KYB → practicá en testnet → al pasar a mainnet: **2 meses sin comisión**.”*

---

## 10. Objeciones y respuestas

| Objeción | Respuesta |
|----------|-----------|
| “¿Por qué crypto?” | USDC = dólar digital estable; no es trading. Misma unidad de cuenta que muchas tesorerías tech ya usan. |
| “¿Y si desaparecen?” | Non-custodial: el escrow está en **smart contract**, no en nuestra cuenta bancaria. |
| “Solo testnet” | Perfecto para **aprender el flujo hoy**. El beneficio **0% × 2 meses** se activa cuando ustedes pasen a **mainnet** con USDC real. |
| “Mi equipo no sabe usar wallet” | OAuth + Freighter guiado; sesión de onboarding incluida en piloto. |
| “Necesito factura legal” | En piloto: foco en operación y ahorro comisión; facturación local en roadmap según país. |
| “Ya usamos Upwork” | Compará **un encargo**: mismo talento LATAM, **3% empresa verificada vs 15–20% Upwork**. |
| “¿Por qué KYB?” | Protege a tus freelancers y desbloquea Founding Partner + **0% en mainnet**. |
| “Quiero probar sin costo” | Testnet gratis para practicar; en **mainnet** Founding Partners tienen **2 meses sin comisión ArcusX** con USDC real. |

---

## 11. Mensajes y plantillas de outreach

### Email — Agencias (Template A) — con Early Adopter

**Asunto:** Founding Partner: 2 meses sin comisión cuando pasen a mainnet

> Hola [Nombre],
>
> Abrimos cupos **Founding Partner** en ArcusX Empresas. **Hoy:** KYB + práctica en testnet con nuestro equipo. **Al activar mainnet:** **0% comisión ArcusX por 2 meses** en USDC real, badge Early Adopter, escrow hasta que apruebes. Después: **3%** (vs 4% estándar y hasta 20% Upwork).
>
> ¿20 minutos esta semana para ver el flujo?
>
> Bruno Andrés · https://arcusx.pro/empresas

### Email — Startups (Template B) — con Early Adopter

**Asunto:** Founding Partner: 0% fee 2 meses al contratar freelancers con escrow

> Hola [Nombre],
>
> Escalar con freelancers en LatAm suele significar contratos lentos y comisiones altas.
>
> **ArcusX Empresas — Early Adopter:** KYB → practicá en testnet → al **mainnet: 0% comisión 2 meses** → badge Founding Partner. Después **3%** (no 20% Upwork).
>
> ¿15 min para una demo?
>
> Bruno Andrés · https://arcusx.pro/empresas

### Email — Aceleradoras (Template C)

**Asunto:** Herramienta para las startups de su portafolio

> ArcusX es contratación freelance con escrow en blockchain. Pagos manuales, comisiones altas y contratos tediosos — problema universal en startups early-stage.
>
> Exploramos alianza para recomendar ArcusX a portafolio. Sin costo para ustedes al empezar.
>
> ¿Conversamos 15 minutos?

### DM LinkedIn (corto)

> Hola [Nombre] — **Founding Partner** ArcusX: practicá en testnet hoy; **2 meses sin comisión al pasar a mainnet**. KYB 48 h. ¿20 min?

### Ángulos por empresa (personalización)

| Empresa | Ángulo |
|---------|--------|
| **Magnar AI** | Automatizan contratos legales; nosotros automatizamos pago a freelancers |
| **diio** | Capital fresco; cuello de botella = contratos freelance → 4 segundos |
| **Encuadrado** | YC alumni; fricción LatAm al contratar devs |
| **Toteat** | Expansión multi-país; un flujo de contrato para todos los mercados |
| **AgendaPro** | $35M para escalar; cada día en contratos manuales cuesta |
| **Creditú** | Fintech $700M+; aún pagan devs con transferencia bancaria |
| **Freaktools** | ¿Cuánto tiempo en transferencias manuales por proyecto? |
| **Bigbuda** | Chile + Canadá; pagos cross-border en segundos |
| **Relevant / Coco** | 3 países = 3 reglas de contrato → uno solo en ArcusX |
| **Baufest** | Nearshore 9 países; unificar contrato y pago |

---

## 12. Pipeline de prospectos (contactos reales)

### TIER 1 — Startups tech (Chile)

| # | Empresa | Decision maker | Contacto | Ángulo |
|---|---------|----------------|----------|--------|
| 1 | Magnar AI | Andrés Arellano (CEO) | LinkedIn: aarellanor · magnar.ai/cl/contacto | LegalTech + automatización pagos |
| 2 | diio | Paolo Colonnello (CEO) | LinkedIn: colonnello | Seed $2.5M, escala rápida |
| 3 | Encuadrado | Thomas Maremaa (CEO) | LinkedIn | YC, $4M ARR |
| 4 | Toteat | René Marty (CEO) | LinkedIn | Expansión LATAM, $7.4M |
| 5 | Gokei | Andrés Valdivia (CEO) | LinkedIn | HealthTech, contratistas |
| 6 | AgendaPro | Julio Guzmán (CEO) | LinkedIn | YC, $35M, escala dev |
| 7 | Creditú | David Muñoz (CEO) | LinkedIn: dmunozchile | Fintech multi-país |

### TIER 2 — Agencias

| # | Empresa | Contacto | Tel / Email |
|---|---------|----------|-------------|
| 8 | Freaktools | Pedro Troncoso (CEO) | contacto@freaktools.cl · +56 9 4267 0582 |
| 9 | Bigbuda | Marcel Acunis (CEO) | +56 2 2914 5568 · Santiago |
| 10 | Siete y Media | — | contacto@sieteymedia.cl |
| 11 | Relevant Agency | — | hola@relevantmkt.com · +54 11 5642 4242 |
| 12 | 1Rocket Digital Labs | — | +52 55 1147 5645 (MX) |
| 13 | Coco Solution | — | clientes@cocosolution.com |
| 14 | Baufest | Ángel Pérez Puletti (CEO) | +54 (11) 4118-8080 · jobs@baufest.com |

### TIER 3 — Alianzas (multiplicadores)

| # | Organización | Contacto | Pitch |
|---|--------------|----------|-------|
| 15 | Platanus Ventures | platanus.ventures | Valor a todo el portafolio |
| 16 | Start-Up Chile | startupchile.org/en/contacto-corporativo | Herramienta oficial alumni |

**Herramientas outreach:** Hunter.io (emails por dominio), Apollo.io, LinkedIn Sales Navigator, Snov.io.

**Flujo:** dominio → email CEO → DM LinkedIn mismo día → follow-up 48h → llamada 20 min → piloto.

---

## 13. Qué está construido (para no oversell)

### Listo / en rollout

- Landing B2B: `arcusx.pro/empresas` + subdominio `empresas.*`
- Login OAuth empresas (Google/GitHub)
- Marketplace: publicar tarea, propuestas, escrow, disputas, evidencia
- KYB empresa v1 (submit + admin approve + badge)
- Política KYB-gate para publicar — 🔲 enforcement backend/frontend pendiente
- Programa **Founding Partner**: 0% ArcusX **2 meses desde mainnet** (no desde testnet); badge Early Adopter — comercial definido; `fee_waived_until` + override 🔲 pendiente técnico
- SDK `@arcusx/sdk` + API partners (embed futuro para SaaS que quieren white-label)

### En desarrollo / no prometer fecha

- Mainnet producción
- Multi-usuario por empresa (roles, invitaciones)
- SSO enterprise
- Facturación legal por país
- Wallet embebida sin Freighter

---

## 14. Visión estratégica (contexto para conversaciones grandes)

ArcusX no es solo marketplace. Es **Work Execution Layer** en Stellar:

- Hoy: marketplace + portal Empresas + deals por link.
- Mañana: **SDK/API** para que cualquier app (DAO, SaaS, agente AI) ejecute “tarea → escrow → pago” sin construirlo.

**Pitch integrador (si el prospecto es SaaS):**

> “Conectá tu plataforma en un día. Nosotros movemos el USDC, resolvemos disputas y liberamos on-chain. Vos te quedás con el usuario.”

Eso convierte a Encuadrado, Magnar o una agencia con producto propio en **partner** además de **cliente**.

---

## 15. Instrucciones para el agente (Claude)

**Objetivo:** Conseguir **empresas que paguen** (piloto o contrato) por usar ArcusX Empresas para contratar y pagar freelancers.

**Tareas:**

1. Priorizar prospectos Tier 1 y 2 con **señal de contratación freelance** (job posts, LinkedIn “freelance”, equipo remoto pequeño).
2. Redactar emails/DMs **personalizados** con ángulo de la tabla §9.
3. Proponer **secuencia** 3 toques: email → LinkedIn → follow-up día 5.
4. Identificar **10 prospectos nuevos** en Chile/Argentina/México con mismo ICP (startup 10–100 personas, agencia digital, fintech).
5. Preparar **script de demo 20 min**: dolor → **Founding Partner (0% 2 meses)** → KYB → 3 pasos → post-promo 3% vs Upwork → CTA.
6. Registrar en pipeline: empresa | contacto | estado | KYB | early_adopter | próxima acción.

**Métrica de éxito del outreach:**

- Meta corto plazo: **3–10 empresas Founding Partner** con KYB aprobado y ≥1 encargo en los 2 meses al 0%.
- Meta medio: **1 contrato enterprise** post-promo con fee **2,5%** + volumen recurrente.

**Tono de marca:** Directo, técnico-honesto. **Lead con Early Adopter** (0% 2 meses) antes que el fee permanente.

**Argumentos clave que siempre repetir:**
1. **Founding Partner:** practicá en **testnet** hoy; **0% comisión ArcusX 2 meses** al activar **mainnet** + badge Early Adopter.
2. Después: **3%** empresa KYB (vs **4%** estándar); **2,5%** con volumen.
3. **KYB obligatorio** para publicar = marketplace limpio.
4. Aun al 4% estándar, 4–5× más barato que Upwork.

**No hacer:**

- Prometer mainnet sin aclarar que hoy es testnet.
- Atacar competidores por nombre con insultos — usar números.
- Vender “inversión crypto” — vender **ahorro comisión + velocidad + escrow**.

---

*Documento interno ArcusX · Comercial Empresas · Mayo 2026*
