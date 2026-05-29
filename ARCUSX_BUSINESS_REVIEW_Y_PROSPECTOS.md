# ArcusX — Business Review Completo + Prospectos B2B
> Análisis estratégico · Mayo 2026 · Co-fundador Marketing & SEO
> Uso interno — no publicar

---

# PARTE 1: REVISIÓN COMPLETA DEL NEGOCIO

---

## 1.1 ESTADO ACTUAL (snapshot Mayo 2026)

| Métrica | Valor | Nota |
|---|---|---|
| Usuarios registrados | 260 | 100% orgánico, testnet |
| Red | Stellar testnet | Mainnet: pendiente |
| Comisión | 3% flat | Asumida por el cliente |
| Velocidad de pago | ~4 segundos | Stellar finality |
| Costo por transacción | <$0.001 | Fee de Stellar |
| Moneda | USDC en Stellar | Estable, no volátil |
| Auth | OAuth Google + GitHub | Sin KYC bancario |
| Wallet soportada | Freighter (Stellar nativa) | Solo Freighter actualmente |
| Ad spend histórico | $0 | Toda la tracción es orgánica |
| Inversión levantada | Pre-seed (no declarada) | Buscando ronda |

---

## 1.2 ARQUITECTURA DEL NEGOCIO

### Productos activos
| Producto | Descripción | Estado |
|---|---|---|
| ArcusX Marketplace | Freelancing descentralizado: tareas + propuestas + escrow | Activo en testnet |
| CertiX | Certificaciones blockchain en Stellar (SHA-256, verificable on-chain) | Activo — Next.js en Vercel |
| Empresas (B2B) | Portal para empresas que contratan talento freelance | En desarrollo |
| Miraes | Proyecto separado, minimal | Ignorado en estrategia actual |

### Flujo de valor (marketplace)
```
Cliente publica tarea con precio USDC
    ↓
Freelancer aplica con propuesta
    ↓
Cliente elige y activa escrow via Trustless Work API
    ↓
Fondos bloqueados en smart contract (non-custodial)
    ↓
Freelancer completa el trabajo
    ↓
Cliente aprueba milestone
    ↓
Liberación automática: USDC al freelancer en 4 segundos
    ↓
ArcusX descuenta 3% como comisión del total
```

### Modelo de ingresos
- **Fuente única actual:** 3% de comisión por tarea completada
- **Quién la paga:** El cliente (no el freelancer)
- **Ejemplo:** Tarea de $1,000 USDC → freelancer recibe $970 → ArcusX $30
- **Proyección a escala:** 100,000 tareas/mes × $150 promedio × 3% = **$450,000 MRR**

### Stack técnico relevante para inversores
- **Frontend:** React 19 + TypeScript + Vite (PWA disponible)
- **Backend:** PHP REST API + MySQL (65 endpoints independientes)
- **Escrow:** Trustless Work API (no custodial, Stellar smart contracts)
- **Auth:** Supabase OAuth (Google/GitHub) + JWT
- **Blockchain:** Stellar (testnet → mainnet pendiente)
- **Wallet:** Freighter via @creit.tech/stellar-wallets-kit
- **B2B:** Subdominio separado, detección automática por host
- **CertiX:** Next.js 14, Redis cache, Vercel Blob storage, Rust smart contract

---

## 1.3 ANÁLISIS FODA

### Fortalezas ✅
1. **Tracción orgánica real:** 260 usuarios sin gastar un peso — señal honesta de PMF
2. **Comisión diferencial:** 3% vs 10–20% de la competencia. Matemáticamente irrefutable.
3. **Non-custodial:** Arquitectura técnica que elimina el riesgo de "plataforma que desaparece con tu dinero"
4. **Velocidad de Stellar:** 4 segundos de liquidación vs días de plataformas tradicionales
5. **Costo de transacción casi cero:** <$0.001 por tx. Viable para micropagos y tareas pequeñas.
6. **USDC (stablecoin):** Elimina la barrera de adopción de crypto por volatilidad
7. **Sub-producto CertiX:** Lead magnet natural + revenue diversification
8. **Stack moderno:** React 19, Supabase, Stellar — atractivo para inversores tech
9. **Foco LATAM:** Mercado con dolor real y plataformas que no sirven bien la región

### Debilidades ⚠️
1. **Solo testnet:** Sin revenue real todavía — limite crítico para fundraising
2. **Una sola wallet:** Solo Freighter. Excluye a quienes usen otras wallets Stellar.
3. **Backend en PHP flat:** 65 archivos sin router — deuda técnica visible para CTOs
4. **Sin tests automatizados:** Riesgo de regresiones al escalar
5. **Comisión hardcodeada:** `PLATFORM_FEE_BPS = 3.0` — ajustar requiere redeploy
6. **Sin app móvil:** La mayoría de LATAM consume mobile-first
7. **Portal Empresas sin casos de uso reales aún:** B2B sin tracción demostrable
8. **Sin presencia de marca fuerte todavía:** Redes sociales recién construyéndose

### Oportunidades 🚀
1. **Mainnet launch:** El primer día en mainnet es el primer día de revenue real
2. **CertiX → ArcusX funnel:** Dev que certifica trabajo naturalmente quiere cobrar bien
3. **Portal Empresas:** Mercado B2B con AOV mayor y contratos recurrentes
4. **LATAM underserved:** Workana y Freelancer.com no están construidos para blockchain
5. **Ecosystem Stellar:** Grants, partnerships, co-marketing con Stellar Foundation
6. **Comunidad de 260 como fuerza de ventas:** Cada Founding Member es un caso de uso
7. **Dispute system como diferenciador:** Pocas plataformas tienen resolución estructurada
8. **SEO de largo plazo:** Keywords de "freelance blockchain LATAM" tienen poco contenido
9. **Regulaciones crypto favorables en Chile y Argentina:** Ventana temporal de adopción

### Amenazas ⚡
1. **Competidores Web3 con más capital:** Braintrust (USA), LaborX, Cryptowork
2. **Upwork/Fiverr reduciendo comisiones:** Si reaccionan al modelo 3%, gap se reduce
3. **Volatilidad del ecosistema Stellar:** Cambios en el protocolo o API de Trustless Work
4. **Regulación crypto LATAM:** Puede cambiar el marco legal en 6–18 meses
5. **Tiempo de adopción de wallets:** Freighter aún tiene UX compleja para no-técnicos
6. **Competencia desde IA:** Plataformas de agentes AI autónomos podrían reemplazar freelancers
7. **Fraude y Sybil attacks:** Sistema anti-Sybil necesita implementación urgente al escalar
8. **Single point of failure:** Trustless Work API como dependencia crítica externa

---

## 1.4 POSICIÓN COMPETITIVA

### Competidores directos
| Plataforma | Comisión | Blockchain | Non-custodial | LATAM focus | USDC |
|---|---|---|---|---|---|
| ArcusX | **3%** | ✅ Stellar | ✅ Sí | ✅ Sí | ✅ Sí |
| Braintrust | 10% client | ✅ Ethereum | ❌ No | ❌ No | ❌ No |
| LaborX | 10–20% | ✅ Multi-chain | ❌ No | ❌ No | Parcial |
| Workana | 8–15% | ❌ No | ❌ No | ✅ Sí | ❌ No |
| Upwork | 10–20% | ❌ No | ❌ No | Parcial | ❌ No |
| Freelancer.com | 10% | ❌ No | ❌ No | Parcial | ❌ No |

**Conclusión:** ArcusX tiene la comisión más baja + blockchain + non-custodial + USDC + LATAM focus. Ningún competidor tiene los 5 simultáneamente.

---

## 1.5 NARRATIVA PARA INVERSORES (pre-seed)

**El problema:**
$30B es el tamaño del mercado freelance en LATAM. El 80% de los proyectos tienen problemas de pago o disputas. Las plataformas actuales cobran hasta 20% y liquidan en semanas.

**La solución:**
ArcusX usa smart contracts en Stellar para garantizar pagos automáticos, no-custodiales, en USDC, en 4 segundos, cobrando 3% flat.

**La tracción:**
260 usuarios en testnet. Cero ad spend. Crecimiento 100% orgánico.

**El modelo:**
3% de comisión. Proyección conservadora: $450K MRR a 100K tareas/mes. Potencial de $5M MRR con Portal Empresas activo.

**Por qué ahora:**
Stellar tiene la mejor ratio velocidad/costo de cualquier L1 pública. USDC está en máximos de adopción institucional. La regulación crypto en LATAM todavía es permisiva. El momento es ahora.

---

## 1.6 PRIORIDADES ESTRATÉGICAS (próximos 90 días)

| Prioridad | Acción | Impacto |
|---|---|---|
| 🔴 Crítica | Lanzar en mainnet | Revenue real = fundraising posible |
| 🔴 Crítica | Activar a los 260 Founding Members | Primeras transacciones reales |
| 🟠 Alta | Implementar anti-Sybil system | Proteger integridad del sistema |
| 🟠 Alta | Lanzar Portal Empresas con 3 clientes piloto | Demostrar B2B |
| 🟡 Media | Integrar segunda wallet Stellar | Ampliar audiencia |
| 🟡 Media | Blog + SEO técnico | Tracción orgánica a 6 meses |
| 🟡 Media | Partnership con Start-Up Chile / Platanus | Distribución + credibilidad |
| 🟢 Secundaria | App móvil (PWA publicada en stores) | Mobile-first LATAM |

---

# PARTE 2: PROSPECTOS B2B — PIPELINE INICIAL

---

## 2.1 PERFIL DE CLIENTE IDEAL (ICP)

### ¿Quién necesita ArcusX Empresas?
Empresas que:
- Contratan desarrolladores freelance para proyectos específicos
- Tienen problemas de impago o disputas con freelancers
- Usan Upwork/Workana y están pagando 10–20% de comisión
- Quieren pagar en USDC sin complicaciones bancarias internacionales
- Tienen CTOs o líderes técnicos que entienden blockchain

### Segmentos target
| Segmento | Por qué les sirve ArcusX | Dolor principal |
|---|---|---|
| Startups early-stage (seed/pre-seed) | Necesitan devs rápido, sin burocracia, precio justo | Presupuesto limitado, contratan freelancers |
| Agencias de desarrollo web | Subcontratan especialistas para proyectos de clientes | Márgenes ajustados + problema de pagos |
| Empresas SaaS en crecimiento | Necesitan devs para features específicas | Flujo de caja impredecible con freelancers |
| Fintechs LATAM | Afines a blockchain + necesitan talento crypto/backend | Alta confianza en tech descentralizada |
| Fundadores no técnicos | Necesitan CTOs/devs freelance para MVP | Riesgo de impago en ambas direcciones |

---

## 2.2 LISTA DE PROSPECTOS — TIER 1 (Prioridad Alta)

> Empresas identificadas con alta probabilidad de necesitar ArcusX ahora.

---

### 🏢 PROSPECTO 1 — Magnar AI
**País:** Chile
**Qué hacen:** Plataforma de IA para ventas — $300K pre-seed levantado (Oct 2025), 100% MoM growth
**Por qué los necesitas:** Startup early-stage con crecimiento acelerado. Necesitan devs para escalar rápido. Limitado presupuesto pero alta necesidad técnica.
**Sitio web:** magnar.ai *(verificar URL actual)*
**Inversores:** Buenaonda, Platanus Ventures, Punto Cero Ventures
**LinkedIn:** Buscar "Magnar AI Chile" en LinkedIn
**Email estrategia:** Buscar fundadores en LinkedIn → Hunter.io con dominio magnar.ai
**Ángulo del pitch:** "Contratan devs freelance para escalar? Con ArcusX pagan 3% en vez de 20% de Upwork. El escrow garantiza que el dev entrega antes de cobrar."

---

### 🏢 PROSPECTO 2 — Creditú
**País:** Chile
**Qué hacen:** Fintech de acceso a financiamiento hipotecario — $832K pre-seed (Mar 2025)
**Por qué los necesitas:** Fintech = afinidad blockchain natural. Startup en crecimiento con necesidad de talento tech.
**LinkedIn:** Buscar "Creditú Chile fintech" en LinkedIn
**Email estrategia:** Hunter.io con dominio creditu.cl o creditu.com
**Ángulo del pitch:** "Son fintech, entienden blockchain. ArcusX es la plataforma que garantiza los pagos a devs freelance on-chain. 3% de comisión. No-custodial."

---

### 🏢 PROSPECTO 3 — Encuadrado
**País:** Chile
**Qué hacen:** Software para agendamiento, facturación y pagos para profesionales independientes
**Por qué los necesitas:** Su producto ES para profesionales independientes. El overlap con ArcusX es perfecto — sus usuarios son exactamente el target de ArcusX.
**Ángulo del pitch:** Doble: (1) Partnership para integración con sus usuarios freelancers, (2) Usar ArcusX para contratar devs que mejoren su propio producto.
**Email estrategia:** Buscar en LinkedIn "Encuadrado Chile" → founders → Hunter.io

---

### 🏢 PROSPECTO 4 — diio
**País:** Chile
**Qué hacen:** IA para equipos de ventas — asistente que escucha reuniones y da feedback en tiempo real
**Por qué los necesitas:** Startup tech activo en crecimiento. Los modelos de IA requieren desarrollo constante — contratan ingenieros y data scientists freelance.
**Inversores:** Cuantico VP, entre otros (según informe 2026)
**LinkedIn:** Buscar "diio Chile AI" en LinkedIn
**Email estrategia:** Hunter.io con dominio diio.cl o similar
**Ángulo del pitch:** "Están escalando IA — necesitan talento tech rápido y sin burocracia. ArcusX garantiza el pago por contrato, no por buena voluntad."

---

### 🏢 PROSPECTO 5 — Toteat
**País:** Chile
**Qué hacen:** Software de gestión para restaurantes (POS, delivery, pedidos)
**Por qué los necesitas:** Startup consolidada con múltiples verticales de producto que requieren desarrollo frecuente. Presencia LATAM.
**LinkedIn:** Buscar "Toteat Chile" en LinkedIn
**Email estrategia:** Hunter.io dominio toteat.com
**Ángulo del pitch:** "Multi-país, multi-producto — necesitan devs especializados por proyecto. ArcusX = escrow automático + talento regional + 3% de comisión."

---

### 🏢 PROSPECTO 6 — Gokei
**País:** Chile
**Qué hacen:** Healthtech — plataforma digital para gestión de gastos de salud y seguros
**Por qué los necesitas:** Startup en crecimiento top-12 Chile 2026 según Cuantico. Necesita desarrollo continuo.
**LinkedIn:** Buscar "Gokei Chile healthtech" en LinkedIn
**Email estrategia:** Hunter.io dominio gokei.cl o similar
**Ángulo del pitch:** "Son startup de salud digital — necesitan devs de confianza y contratos claros. ArcusX garantiza que el freelancer entrega antes de cobrar."

---

## 2.3 LISTA DE PROSPECTOS — TIER 2 (Agencias que subcontratan devs)

---

### 🏢 PROSPECTO 7 — Freaktools Agencia Digital
**País:** Chile (Santiago)
**Qué hacen:** Agencia digital — diseño, desarrollo web, marketing
**Sitio web:** freaktools.cl
**Fundador:** Diseñador Gráfico Publicitario con 10+ años (nombre: buscar en freaktools.cl/equipo)
**Por qué los necesitas:** Las agencias subcontratan especialistas constantemente. Si usan freelancers, ArcusX les ahorra comisiones y garantiza entregas.
**Email:** Buscar en freaktools.cl → contacto o formulario
**LinkedIn:** Buscar "Freaktools Chile" en LinkedIn
**Ángulo del pitch:** "Como agencia, cuando subcontratas un dev, ¿tienes garantía de que entrega? Con ArcusX el pago solo se libera cuando el trabajo está aprobado. Y la comisión es 3%, no 20%."

---

### 🏢 PROSPECTO 8 — Agencia Cebra
**País:** Chile (Santiago) — presencia en Argentina, México, Colombia, USA
**Qué hacen:** Agencia digital full service — marketing, desarrollo, diseño
**Por qué los necesitas:** Multipaís + multidisciplinaria = usan freelancers especializados constantemente
**Sitio web:** cebra.cl o cebra.com
**Email estrategia:** Hunter.io con dominio cebra.cl
**Ángulo del pitch:** "Con presencia en 5 países y más de 100 clientes, seguro subcontratan devs. ArcusX garantiza las entregas con escrow blockchain y cobra solo 3%."

---

### 🏢 PROSPECTO 9 — AgendaPro
**País:** Chile (presencia LATAM)
**Qué hacen:** Software de gestión para negocios de servicios (salones, clínicas, etc.)
**Por qué los necesitas:** Empresa consolidada con múltiples verticales — necesitan desarrollo continuo y especializado
**Sitio web:** agendapro.com
**LinkedIn:** [AgendaPro en LinkedIn](https://www.linkedin.com/company/agendapro)
**Email estrategia:** Hunter.io con agendapro.com → buscar CTO o Head of Engineering
**Ángulo del pitch:** "Para escalar un producto tan transversal como el suyo necesitan talento tech constante. Con ArcusX: escrow automático, sin comisiones abusivas."

---

### 🏢 PROSPECTO 10 — 1Rocket Digital Labs
**País:** México (expansión LATAM + Europa)
**Qué hacen:** Agencia digital y de desarrollo de software
**Sitio web:** 1rocket.mx
**Por qué los necesitas:** Agencia de desarrollo activa en México y Europa — contratan freelancers especializados
**Email estrategia:** Hunter.io con dominio 1rocket.mx
**LinkedIn:** Buscar "1Rocket Mexico" en LinkedIn
**Ángulo del pitch:** "Agencia de desarrollo con proyectos en múltiples mercados — exactamente el tipo de empresa que se beneficia de garantías de escrow para proyectos con freelancers remotos."

---

## 2.4 LISTA DE PROSPECTOS — TIER 3 (Partnerships estratégicos)

Estos NO son clientes directos — son multiplicadores. Un deal con uno de estos vale 100 clientes normales.

---

### 🤝 PARTNERSHIP 1 — Platanus Ventures
**País:** Chile (Santiago)
**Qué hacen:** Aceleradora de startups tech — $200K × 5.5% equity por startup. Portfolio: Toku, Fintual, Magnar, Examedi, etc.
**Por qué te importa:** Cada startup de su portfolio necesita devs. Si Platanus recomienda ArcusX a su portfolio, tienes pipeline inmediato de 50+ startups.
**Contacto:** platan.us | info@platan.us *(verificar en sitio)*
**LinkedIn:** [Platanus Ventures LinkedIn](https://www.linkedin.com/company/platanus-ventures)
**Propuesta:** Co-marketing + "herramienta recomendada para contratar freelancers" en su programa de aceleración

---

### 🤝 PARTNERSHIP 2 — Start-Up Chile
**País:** Chile
**Qué hacen:** Aceleradora pública — 3,000+ startups en portfolio. Top 10 aceleradoras del mundo.
**Por qué te importa:** Contacto directo: contacto@startupchile.org | startupchile.org
**Propuesta:** Programa piloto: "ArcusX como plataforma oficial de contratación freelance para startups del portafolio SUP"
**Potencial:** Acceso directo a cientos de startups activas buscando talento

---

### 🤝 PARTNERSHIP 3 — Rockstart LATAM
**País:** Colombia (Bogotá) — LATAM
**Qué hacen:** Aceleradora global con foco en LATAM — invierte $125K por 6%
**Por qué te importa:** Portfolio de startups tech en toda la región que necesitan devs
**Sitio web:** rockstart.com
**LinkedIn:** Buscar "Rockstart LATAM" en LinkedIn
**Propuesta:** Partnership como herramienta de escrow freelance recomendada para su portfolio

---

### 🤝 PARTNERSHIP 4 — Get on Board
**País:** Chile (Santiago)
**Qué hacen:** Plataforma de empleos tech en LATAM — conecta devs con startups
**Por qué te importa:** Su audiencia = exactamente los freelancers y las empresas que usa ArcusX
**Sitio web:** getonbrd.cl
**Propuesta:** Co-marketing: "Para proyectos puntuales, usa ArcusX" — canal de referidos cruzado

---

## 2.5 HERRAMIENTAS PARA ENCONTRAR EMAILS Y TELÉFONOS

> El web search no devuelve emails privados de founders (correcto por privacidad). Estas son las herramientas que SÍ lo hacen, legalmente, para B2B outreach.

### Stack recomendado de prospecting

| Herramienta | Para qué | Precio aprox | URL |
|---|---|---|---|
| **Hunter.io** | Encontrar emails por dominio de empresa | $49/mes (500 búsquedas) | hunter.io |
| **Apollo.io** | Base de datos completa: email + LinkedIn + teléfono + cargo | $49/mes | apollo.io |
| **LinkedIn Sales Navigator** | Encontrar decision makers por cargo, empresa, tamaño | $99/mes | linkedin.com/sales |
| **Snov.io** | Email finder + verificador + secuencias de outreach | $39/mes | snov.io |
| **RocketReach** | Emails + teléfonos de ejecutivos | $53/mes | rocketreach.co |

### Flujo de trabajo recomendado
```
1. Identificar empresa target (esta lista)
2. Buscar en LinkedIn: CEO/CTO/Head of Engineering
3. Tomar el nombre completo + dominio de la empresa
4. Usar Hunter.io: ingresar dominio → obtener email del founder
5. Verificar con NeverBounce o Hunter Verify antes de enviar
6. Cargar en secuencia de outreach (Apollo o Snov.io)
7. Paso 1: Email frío personalizado
8. Paso 2 (3 días después): Follow-up si no responde
9. Paso 3 (5 días después): LinkedIn message como respaldo
10. Si responde: agendar demo 30 min via Calendly
```

---

## 2.6 PLANTILLAS DE OUTREACH

### PLANTILLA A — Para startups tech (frío, email)

**Asunto:** `[Nombre startup] + freelancers → ¿cuánto están pagando de comisión?`

```
Hola [Nombre],

Vi que [Nombre startup] está creciendo rápido — [referencia específica: ronda levantada / producto / coverage de prensa].

Una pregunta directa: cuando contratan devs freelance para proyectos específicos, ¿usan Upwork o algo similar?

Si es así, probablemente están pagando entre 10% y 20% de comisión por cada proyecto.

Construí ArcusX (arcusx.pro) — una plataforma de freelancing en Stellar blockchain:
- 3% de comisión (no 20%)
- El escrow garantiza que el dev entrega antes de cobrar
- Pago en USDC, liquidación en 4 segundos
- El dinero lo custodia el smart contract, no nosotros

Tenemos 260 devs en LATAM ya registrados en testnet.

¿Tendrían 20 minutos para ver cómo funciona? Puedo mostrarles el flujo completo.

[Tu nombre]
ArcusX — arcusx.pro
```

---

### PLANTILLA B — Para agencias de desarrollo (frío, email)

**Asunto:** `[Nombre agencia]: ¿subcontratan devs? Esto les puede ahorrar mucho`

```
Hola [Nombre],

Revisando el trabajo de [Nombre agencia] — tienen proyectos muy sólidos en [especialidad].

Directo al punto: cuando subcontratan desarrolladores para proyectos de clientes, ¿cómo manejan la garantía de entrega y el pago?

En muchas agencias el problema es el mismo: o confías en la promesa del dev, o usas Upwork y pierdes 20% de margen.

Construimos ArcusX para resolver exactamente eso:
- Escrow automatizado: el dev cobra cuando entrega, no antes
- 3% de comisión (vs 10-20% en plataformas tradicionales)
- Pago en USDC sobre Stellar: 4 segundos, sin fees bancarios
- LATAM: talento chileno, argentino, colombiano, mexicano ya en la plataforma

¿Tienen 20 minutos esta semana para ver una demo?

[Tu nombre]
ArcusX — arcusx.pro
```

---

### PLANTILLA C — Para partnerships con aceleradoras

**Asunto:** `Propuesta de partnership: ArcusX + [Nombre aceleradora] portfolio`

```
Hola [Nombre],

[Nombre aceleradora] tiene un portfolio increíble de startups tech en LATAM. Llevo tiempo siguiendo su trabajo.

Quiero proponerles algo concreto: ArcusX como herramienta recomendada para contratar talento freelance en el programa de aceleración.

ArcusX (arcusx.pro) es una plataforma de freelancing descentralizada en Stellar:
- 3% de comisión
- Escrow no-custodial (el dinero lo guarda el smart contract, no nosotros)
- USDC, liquidación en 4 segundos
- 260 devs LATAM ya registrados

Para las startups del portafolio que necesiten devs para proyectos específicos, ArcusX les da garantías que Upwork no puede dar.

¿Podemos explorar esto en una llamada de 30 minutos?

[Tu nombre]
ArcusX — arcusx.pro
```

---

### PLANTILLA D — LinkedIn (mensaje directo, 300 caracteres)

```
Hola [Nombre], vi lo que están construyendo en [Empresa] — muy interesante.

¿Contratan devs freelance para proyectos? Estamos lanzando ArcusX (arcusx.pro), freelancing en blockchain con 3% de comisión y pago garantizado por escrow.

¿Conversamos 20 min?
```

---

## 2.7 AGENDA DE DEMO (30 minutos)

```
00:00 – 03:00  Intro: quiénes somos, por qué Stellar, por qué ahora
03:00 – 08:00  El problema que resolvemos (fees + impago + burocracia)
08:00 – 18:00  Demo en vivo:
                  → Publicar una tarea
                  → Ver propuestas de freelancers
                  → Activar escrow
                  → Simular aprobación + liberación de fondos
18:00 – 22:00  CertiX (si hay interés en certificar trabajo de devs)
22:00 – 28:00  Preguntas + siguiente paso
28:00 – 30:00  Propuesta concreta: piloto con 3 tareas reales
```

---

## 2.8 PIPELINE TRACKER (template)

| Empresa | Contacto | Cargo | Email | LinkedIn | Estado | Próximo paso | Fecha follow-up |
|---|---|---|---|---|---|---|---|
| Magnar AI | [buscar] | CEO/CTO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 3 |
| Creditú | [buscar] | CEO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 3 |
| Encuadrado | [buscar] | CEO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 5 |
| diio | [buscar] | CEO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 5 |
| Toteat | [buscar] | CEO/CTO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 8 |
| Gokei | [buscar] | CEO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 8 |
| Freaktools | [buscar] | Fundador | freaktools.cl | [LinkedIn] | Por contactar | Email frío B | Jun 10 |
| Agencia Cebra | [buscar] | Director | [hunter.io] | [LinkedIn] | Por contactar | Email frío B | Jun 10 |
| AgendaPro | [buscar] | CTO | [hunter.io] | [LinkedIn] | Por contactar | Email frío A | Jun 12 |
| 1Rocket | [buscar] | CEO | [hunter.io] | [LinkedIn] | Por contactar | Email frío B | Jun 12 |
| Platanus Ventures | Team | Partners | info@platan.us | [LinkedIn] | Partnership | Email frío C | Jun 15 |
| Start-Up Chile | Directora | Directora | contacto@startupchile.org | [LinkedIn] | Partnership | Email frío C | Jun 15 |
| Rockstart LATAM | [buscar] | Director | [hunter.io] | [LinkedIn] | Partnership | Email frío C | Jun 17 |

---

## 2.9 MÉTRICAS DE ÉXITO DEL PIPELINE

### Objetivos Junio–Julio 2026
| Métrica | Objetivo |
|---|---|
| Emails enviados | 50 |
| Open rate objetivo | >40% (subject lines personalizadas) |
| Reply rate objetivo | >8% |
| Demos agendadas | 5–8 |
| Pilotos cerrados | 2–3 empresas |
| Tareas publicadas por empresas piloto | 10+ |

---

*Documento vivo — actualizar pipeline tracker semanalmente*
*ArcusX Marketing & Sales · Mayo 2026*
