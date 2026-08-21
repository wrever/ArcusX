# ArcusX Empresas — Brief comercial (outreach B2B)

**Uso:** Brief interno para ventas / demos del portal Empresas — startups, agencias y SaaS que contratan freelancers (prioridad **Chile**, luego LATAM).

**Contacto:** Bruno Andrés · ArcusX · https://arcusx.pro · Portal B2B: https://arcusx.pro/empresas (`empresas.*`)

**Estado ago 2026:** Producto en **Stellar Testnet**; piloto B2B con onboarding manual. Mainnet = próximo hito. Fee **2%** (`getPlatformFee`).

**Chile — límites legales/comerciales (no negociables en el pitch):**
- ArcusX **no emite boletas de honorarios ni facturas electrónicas** (SII).
- ArcusX **no** es banco ni entidad de pago regulada (CMF).
- Settlement = **USDC on-chain** (no CLP / transferencia bancaria chilena).
- Non-custodial: el usuario firma con su wallet.
- Crypto en Chile: marco en evolución — **no** dar asesoría tributaria ni laboral.
- Detalle y CAP: [`CUSTOMER_ACQUISITION_PLAN.md`](./CUSTOMER_ACQUISITION_PLAN.md) §0.


---

## 1. Qué es ArcusX (una frase)

**ArcusX** es infraestructura de ejecución de trabajo con **escrow en USDC sobre Stellar**: publicas un encargo, eliges quién lo ejecuta, el dinero queda en smart contract hasta que apruebas la entrega, y el pago se liquida en segundos. No somos custodios del dinero — el contrato on-chain sí.

**ArcusX Empresas** es el portal B2B para equipos que coordinan talento **por tarea** con escrow USDC: CTOs y founders que necesitan devs/diseño/especialistas sin inflar plantilla. No reemplaza asesoría laboral ni emisión de documentos tributarios.

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
| **Pagas por resultado** | Encargo acotado: hito, presupuesto, criterios de aceptación |
| **Escrow automático** | Fondos en smart contract hasta el OK del pagador |
| **USDC en Stellar** | Stablecoin; liquidación **~4 segundos** tras aprobar |
| **Non-custodial** | ArcusX no retiene fondos ni claves de wallet del cliente |
| **Comisión baja** | **2%** total al worker al liberar (cliente fondea el nominal); vs 10–20% marketplaces tradicionales |
| **Huella auditable** | Tarea + liberaciones trazables on-chain |
| **Mismo motor que el marketplace** | Acceso a talento LATAM del mercado ArcusX |
| **Verificación empresas** | Onboarding KYB / revisión manual en piloto antes de publicar a escala |

### Headline del landing (copy aprobado)

- **Título:** *Contrata talento por tarea. Sin contratar de más.*
- **Subtítulo:** *Publica el encargo, elige propuesta y libera USDC en escrow cuando apruebas la entrega. (No reemplaza asesoría legal/tributaria ni emisión de boletas.)*

### Tres pilares (venta)

1. **Pagas por resultado, no por “puesto”** — talento sin rol interno permanente.
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

1. **Publicas el encargo** — tarea, presupuesto USDC, quién aprueba en la empresa.
2. **Ejecución + escrow** — el talento entrega; el pago sigue bloqueado.
3. **Apruebas y se liquida** — USDC al wallet del ejecutor on-chain.

---

## 3. Comparativa competitiva (usar en calls)

| | Upwork / Workana | ArcusX Empresas |
|--|------------------|-----------------|
| Comisión total | 10–20% | **~2%** (worker; cliente fondea nominal) |
| Custodia | Plataforma retiene | **Smart contract** |
| Tiempo de pago | Días / semanas | **Segundos** tras aprobar (Stellar) |
| Moneda | Fiat + fees FX | **USDC** (hoy Testnet; mainnet próximo) |
| Garantía | Política de la plataforma | **Código on-chain** |
| Onboarding | KYC bancario pesado | **OAuth (Google/GitHub) + wallet** |

**Posicionamiento:** No somos “Upwork Web3”. Somos **ejecución de trabajo + cobro condicionado** para equipos que ya contratan freelancers y están cansados de comisiones y demoras.

---

## 4. Pricing y comisiones (modelo real — importante para ventas)

### Comisión ArcusX: **2%** (fuente: API `getPlatformFee`)

| Quién | Qué ve |
|-------|--------|
| Cliente / empresa | Fondea el **nominal** acordado (sin surcharge de plataforma) |
| Worker | Recibe ~**98%** al liberar |
| ArcusX | Take rate **2%** embebido en el escrow |

**Ejemplo (1.000 USDC nominal):** cliente fondea **1.000**; worker ~**980**; comisión ~**20** USDC.

**Pitch vs Workana/Upwork:** en $5.000/mes de freelancers, ~15% = **$750**; ArcusX 2% = **~$100**.

### Tiers comerciales (opcional, por escrito)

| Tier | Fee | Quién |
|------|-----|-------|
| Estándar | **2%** | Marketplace + Empresas |
| Volumen / enterprise | Negociado (&lt; 2%) | Solo con acuerdo y volumen real |
| Founding Partner (mainnet) | Ver §8 | Cupos limitados; no inventar % |

### Otros ingresos (roadmap / no prometer como listo)

| Concepto | Nota |
|----------|------|
| Plan Enterprise SaaS | Roadmap (SSO, SLA) |
| KYB | Incluido en piloto |
| SDK / partner GMV | Ver CAP Motor A |

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
- Operación **Chile primero** (Santiago + remoto); luego Argentina, México, Colombia, Perú.

### Segmentos prioritarios

| Segmento | Por qué compran | Dolor #1 |
|----------|-----------------|----------|
| **Startups tech** (15–80 personas) | Escala rápida con contratistas | Contratos + pagos lentos |
| **Agencias digitales** | 5–15 freelancers por proyecto | Excel de pagos + cross-border |
| **SaaS en crecimiento** | Features puntuales sin headcount | Flujo de caja impredecible |
| **Fintechs LATAM** | Entienden blockchain/USDC | Misma infra que ya confían |
| **Consultoras nearshore** | Devs en 3+ países | Unificar contrato/pago |

### Anti-ICP (no perder tiempo — crítico Chile)

- Exigen **boleta de honorarios / factura electrónica** emitida por ArcusX.
- Solo aceptan **CLP** a cuenta bancaria chilena.
- Preguntan si somos **entidad de pago CMF** y no aceptan el framing software/escrow.
- Empresas que **nunca** usarían USDC/wallet.
- Quien busca **nómina / EOR / contrato laboral** vía la plataforma.
- Procurement enterprise pesado (12 meses vendor) sin apertura crypto.

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

### Estado técnico (honestidad comercial)

| Pieza | Estado |
|-------|--------|
| Flujo KYB submit + admin approve | ✅ Construido |
| API `can_publish_as_enterprise` en `get_verification_status` | ✅ Existe |
| Badge en listados `creator_verified_enterprise` | ✅ Construido |
| **Bloqueo backend** en `create_task` / `create_deal` / ofertas privadas | 🔲 **Pendiente — prioridad alta** |
| **Bloqueo frontend** (CreateTask, DealWizard deshabilitados) | 🔲 **Pendiente** |

**En outreach:** KYB = **verificación interna del producto** (quién publica). **No** es inscripción CMF ni cumplimiento SII. En piloto: *“activamos publicación tras verificación (24–72 h)”*.

---

## 8. Programa Early Adopter Empresas (gancho de cierre)

**Nombre:** *ArcusX Empresas — Founding Partner*

**Objetivo:** Onboarding en **Testnet** hoy; al pasar a **mainnet**, cupos Founding pueden tener **beneficio temporal** (ej. 1–2 meses sin fee de plataforma) — **solo por escrito** y con cupos reales (sugerencia Chile: **5–8**, no 15).

### Fases

| Fase | Qué pasa | Comisión |
|------|----------|----------|
| **1 — Testnet** (ahora) | Verificación, onboarding, 1–3 encargos de práctica | Sin GMV real |
| **2 — Mainnet** | USDC real; beneficio Founding si aplica | Acordado por escrito |
| **3 — Régimen normal** | Fee público **2%** | Fuente: API |

### Beneficios que sí se pueden ofrecer hoy

| Beneficio | Detalle |
|-----------|---------|
| Onboarding guiado (WhatsApp / call) | Freighter + primer flujo Testnet |
| Badge Early Adopter | Si está en producto |
| Verificación prioritaria | 24–72 h en piloto |
| Línea directa founders | Cupos limitados |

### Beneficios a definir (no inventar en la llamada)

| Beneficio | Estado |
|-----------|--------|
| 0% × N meses en mainnet | 🔲 Solo si hay política escrita |
| Fee &lt; 2% por volumen | 🔲 Negociación post-piloto |
| Logo en `empresas.*` | 🔲 Con consentimiento |
| Cupos Founding | Sugerencia: **5–8 empresas Chile** |

### Reglas (no inventar)

1. Testnet ≠ dinero real.  
2. Fee público vigente = **2%** salvo acuerdo escrito.  
3. Verificación antes de publicar a escala.  
4. Early adopter ≠ gratis para siempre.  
5. En Chile: esperar objeción Freighter/CLP — responder con onboarding, no con promesa de fiat día 1.

### One-liner

> *“Practica en Testnet hoy con soporte directo. Cuando pasen a mainnet, vemos cupo Founding (beneficio temporal por escrito) y después fee 2%.”*

---

## 9. Oferta de piloto (cerrar primeros cupos Chile)

**Fase A — Testnet (ahora)**  
1. Cupo Founding (máx. **5–8** en Chile al inicio).  
2. Verificación 24–72 h.  
3. Onboarding + 1–3 encargos de práctica (Freighter guiado).  
4. Badge Early Adopter si aplica.

**Fase B — Mainnet**  
5. Primer fondeo real acompañado.  
6. Beneficio temporal Founding **solo si** está por escrito.  
7. Después: fee **2%** estándar.

**CTA:** *“20 min demo → verificación → practica en Testnet → mainnet cuando esté listo.”*

---

## 10. Objeciones y respuestas

| Objeción | Respuesta |
|----------|-----------|
| “¿Por qué crypto?” | USDC = unidad estable on-chain; no es trading. Escrow técnico en Stellar. |
| “¿Y si desaparecen?” | Non-custodial: fondos en **smart contract**, no en cuenta bancaria ArcusX. |
| “Solo testnet” | Correcto para practicar sin USDC real. Mainnet = hito aparte + disclaimers. |
| “Mi equipo no sabe usar wallet” | Onboarding Freighter en piloto; si no hay wallet, no es fit. |
| “Necesito factura / boleta” | **No emitimos boletas ni facturas SII.** Si es requisito duro → no somos fit. |
| “Necesito pagar en CLP” | **No.** Solo USDC on-chain. Sin transferencia bancaria chilena en el producto. |
| “¿Están regulados / CMF?” | Somos **software** non-custodial, no entidad de pago. |
| “¿Y los impuestos?” | No asesoramos ni liquidamos impuestos. Que consulten a su contador/abogado. |
| “¿Reemplaza contrato laboral?” | **No.** Coordinación + escrow; no sustituye relación laboral. |
| “Ya usamos Upwork / Workana” | Compara un encargo: fee **~2%** vs 10–20% (settlement crypto, no fiat). |
| “Quiero probar sin costo” | Testnet gratis; fee mainnet = **2%** salvo acuerdo Founding por escrito. |

---

## 11. Mensajes y plantillas de outreach

### Email — Agencias (Template A)

**Asunto:** Piloto ArcusX Empresas — escrow USDC (Testnet)

> Hola [Nombre],
>
> Abrimos cupos **Founding Partner** en Chile (piloto técnico). **Hoy:** verificación + Testnet. Escrow USDC non-custodial; fee **2%**. No emitimos boletas ni movemos CLP — somos software de escrow. Beneficio mainnet solo por escrito.
>
> ¿20 minutos esta semana para ver el flujo?
>
> Bruno Andrés · https://arcusx.pro/empresas

### Email — Startups (Template B)

**Asunto:** Contratar freelancers con escrow (sin 15% de marketplace)

> Hola [Nombre],
>
> Escalar con freelancers en Chile/LATAM suele ser transferencia a ciegas o comisiones altas.
>
> **ArcusX Empresas:** encargo → escrow USDC → liberas al aprobar. **Testnet** + Freighter. Fee **2%**. No boletas SII / no CLP bancario.
>
> ¿15 min para una demo?
>
> Bruno Andrés · https://arcusx.pro/empresas

### Email — Aceleradoras (Template C)

**Asunto:** Herramienta para startups del portafolio (Chile)

> ArcusX es contratación freelance con escrow en Stellar. Problema típico early-stage: pagos manuales y fees altos.
>
> Ofrecemos 1–2 cupos piloto (Testnet) para startups del portafolio. Sin costo de plataforma en la práctica Testnet.
>
> ¿Conversamos 15 minutos?

### DM LinkedIn (corto)

> Hola [Nombre] — ArcusX Empresas: escrow USDC para freelancers, fee 2%. Piloto Testnet + onboarding. ¿20 min?


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
- Programa **Founding Partner**: cupos limitados; beneficio mainnet **solo por escrito**; fee público **2%**; `fee_waived_until` 🔲 pendiente técnico si aplica
- SDK `@arcusx/sdk` + API partners (embed futuro para SaaS que quieren white-label)

### En desarrollo / no prometer fecha

- Mainnet producción
- Multi-usuario por empresa (roles, invitaciones)
- SSO enterprise
- Wallet embebida sin Freighter

### Fuera de alcance (no “roadmap” comercial)

- Emisión de **boletas / facturas SII**
- Pagos en **CLP** / integración banca chilena
- Licencia como entidad de pago / banco
- Asesoría tributaria o laboral

---

## 14. Visión estratégica (contexto para conversaciones grandes)

ArcusX no es solo marketplace. Es **Work Execution Layer** en Stellar:

- Hoy: marketplace + portal Empresas + deals por link.
- Mañana: **SDK/API** para que cualquier app (DAO, SaaS, agente AI) ejecute “tarea → escrow → pago” sin construirlo.

**Pitch integrador (si el prospecto es SaaS):**

> “Conecta tu plataforma. Nosotros orquestamos el USDC, disputas y liberación on-chain. Tú te quedas con el usuario.”

Eso convierte a un SaaS o agencia con producto propio en **partner** además de **cliente**. Ver CAP Motor A.

---

## 15. Checklist operativo de outreach (equipo / founder)

**Objetivo:** Empresas chilenas (luego LATAM) en piloto Testnet con verificación.

**Tareas semanales (realista):**

1. Priorizar prospectos con señal de contratación freelance.  
2. 8–10 contactos/semana (LinkedIn + WhatsApp/email), no 30.  
3. Secuencia: mensaje → follow-up día 3–5 → call 20 min.  
4. Sumar **5–10** prospectos nuevos Chile al mes al CRM.  
5. Demo: dolor → escrow 3 pasos → fee 2% vs Workana → CTA Testnet.  
6. Registrar: empresa | contacto | estado | verificación | próxima acción.

**Metas 90 días (alineadas al CAP):** **2–4** pilotos empresa; no prometer 10 Founding cerrados.

**Tono:** directo, técnico-honesto. Español Chile (tú).

**Siempre repetir:**
1. Hoy = Testnet; mainnet = hito aparte.  
2. Fee **2%** (API).  
3. Escrow non-custodial.  
4. Freighter onboarding incluido en piloto.

**No hacer:**
- Prometer boletas, facturas SII, CLP bancario o “estamos regulados como banco/PSP”.  
- Decir “sin impuestos” / “sin papeles” / “evitas al SII”.  
- Prometer mainnet sin aclarar Testnet + disclaimers.  
- Inventar % de fee o “0%” sin política escrita.  
- Vender inversión crypto o reemplazo de contrato laboral.  
- Dar asesoría tributaria o laboral.

---

*Documento interno ArcusX · Comercial Empresas · Ago 2026 · Mercado primario: Chile*
