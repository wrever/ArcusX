# ArcusX — Business Team & Model
### v2.0 — Actualizado 2026-04-26

> Misión: ser la infraestructura de ejecución de trabajo técnico sobre Stellar — para humanos y agentes AI.
> No somos un Upwork con cripto. Somos el protocolo donde el trabajo técnico sucede y se paga.

---

## 0. El Mercado Real (por qué esto es grande)

| Mercado | 2024 | 2030–2032 | CAGR |
|---------|------|-----------|------|
| Freelancing marketplaces | $6.4B | $24B | 18.6% |
| AI Agents marketplaces | $5.3B | **$52.6B** | **46.3%** |
| e-KYC / verificación identidad | $832M | $10B | **31.9%** |
| Crypto compliance + KYC | $3.1B | $9.1B | 14.4% |
| **TAM combinado** | | **>$85B** | |

ArcusX opera en la intersección de los tres mercados. No hay un ganador Web3 nativo. El espacio está abierto.

---

## 1. El Equipo de Negocios

### CEO / Founder — Visión y Estrategia
**Responsabilidades:**
- Define el norte del producto y la narrativa pública
- Relaciones con inversores: Stellar Development Foundation (grants hasta $200K), a16z crypto, Multicoin Capital
- Decisiones de expansión geográfica: LATAM → África → SE Asia
- Voz de la marca en conferencias: Consensus, Stellar Meridian, Token2049, Pragma

**KPI:** Capital levantado, partnerships estratégicos firmados por trimestre

---

### COO — Operaciones y Crecimiento
**Responsabilidades:**
- Convierte visión en OKRs semanales medibles
- Gestiona onboarding de los primeros 1,000 freelancers y clientes
- Diseña procesos de resolución de disputas y soporte (SLA < 24h)
- Gestión del programa de embajadores por país

**KPI:** GMV mensual, tasa de retención mes 2 (target >60%)

---

### CPO — Product & UX
**Responsabilidades:**
- Prioriza backlog: wallets adicionales, reputación on-chain, bounties, AI agent API
- Investiga pain points de freelancers en LATAM, África, SE Asia (entrevistas semanales)
- Define experiencia sin fricción: onboarding completo sin conocimiento previo de cripto
- Diseña flujo de "ArcusX Verified" (KYC + CertiX badge)

**KPI:** Tiempo hasta primer pago exitoso < 10 min; tasa de completación de onboarding > 70%

---

### CTO — Tecnología y Blockchain
**Responsabilidades:**
- Migración Testnet → Mainnet (prioridad máxima)
- Arquitectura multi-wallet: Freighter (live) → Albedo → xBull (Week 3)
- Integración CertiX como capa de verificación dentro de ArcusX
- Seguridad backend: preparar auditoría externa antes de Mainnet
- Diseñar ArcusX Task API para que agentes AI puedan postular a bounties

**KPI:** Uptime 99.9%, confirmación de escrow < 5s, cero vulnerabilidades críticas en auditoría

---

### CMO — Marketing y Comunidad
**Responsabilidades:**
- Narrativa: "infraestructura para trabajo técnico" — no solo freelancing
- Contenido SEO: "cómo cobrar en USDC en LATAM", "freelancing sin banco"
- Comunidad Discord/Telegram; programa de embajadores por país
- Partnerships con bootcamps (Platzi, Coderhouse, Holberton, Henry)
- PR en medios cripto: CoinDesk, Decrypt, The Block

**KPI:** CAC < $5 por freelancer activo, 20% MoM de crecimiento de comunidad

---

### CFO — Finanzas y Tokenomics
**Responsabilidades:**
- Gestión del fee de plataforma: **1% actual** (revisión a 18 meses según competencia)
- Tesorería en USDC/XLM; política de conversión y reservas
- Estructura legal: Chile como base, entidades en EEUU/Singapur para inversores
- Levantamiento: grants SDF → ronda pre-seed $500K → seed $2-3M (mes 12)
- Proyecciones financieras y runway (mínimo 18 meses siempre)

**KPI:** Runway ≥18 meses, break-even en mes 14, margen bruto >85%

---

### Head of Partnerships — Alianzas Estratégicas
**Responsabilidades:**
- Educación: Platzi, Coderhouse, Holberton, Laboratoria, Henry
- Herramientas: Notion, Figma, GitHub (integrar como portfolio del freelancer)
- Exchanges LATAM: Buda, Ripio, Bitso (fiat → USDC on-ramp)
- Ecosistema Stellar: Trustless Work, Soroswap, Lobstr, SDF

**KPI:** 3 partnerships activos por mes generando usuarios verificables

---

### Head of Growth / Data — Métricas y Experimentos
**Responsabilidades:**
- Funnel: visitante → registro → primera tarea → primer pago → segunda tarea
- A/B testing en onboarding, creación de tareas y flujo de escrow
- Dashboards de retención, NPS, GMV por categoría y país
- Detectar categorías con mayor GMV por tarea → priorizar con CPO

**KPI:** MoM GMV growth > 20%, LTV/CAC > 3x al mes 9

---

## 2. Modelo de Negocios (v2.0)

### 2.1 Propuesta de Valor Actualizada

| Para el Freelancer | Para el Cliente | Para Empresas / AI Agents |
|--------------------|-----------------|--------------------------|
| **1% de comisión** vs 10-20% en Upwork | Escrow garantizado — fondos bloqueados hasta aprobar trabajo | API de escrow + pagos instantáneos |
| Pago en 5 segundos, sin banco | Disputas transparentes y on-chain | Infraestructura de pago para agentes autónomos |
| Acceso global sin restricciones | Freelancers verificados con CertiX badge | SLA, soporte dedicado, analytics |
| Reputación on-chain portable — tuya para siempre | Historial verificable de trabajo completado | Compliance KYC integrado |

---

### 2.2 Flujos de Ingresos (ordenados por prioridad)

#### Ingreso 1 — Comisión de plataforma (desde día 1)
- **1%** sobre cada pago liberado desde el escrow
- Se cobra automáticamente en el release de fondos (Trustless Work lo deduce del escrow)
- Sin costo marginal adicional al escalar

```
Proyección de ingresos por comisión:
  GMV $50K/mes   → $500/mes
  GMV $300K/mes  → $3,000/mes  ← break-even operativo
  GMV $1M/mes    → $10,000/mes
  GMV $10M/mes   → $100,000/mes
```

#### Ingreso 2 — ArcusX Verified / KYC (Mes 3+)
| Tier | Precio | Incluye |
|------|--------|---------|
| **Basic** | Gratis | Email verificado + wallet conectada |
| **Verified** | $19 one-time | CertiX badge on-chain + verificación de documento |
| **Pro** | $49/año | Verified + skills certificados + prioridad en búsqueda + fee 0.5% |
| **Enterprise** | Custom ($299+/mes) | KYC institucional + SLA + API acceso + soporte dedicado |

*El mercado e-KYC crece al 31.9% anual. CertiX ya existe — solo hay que conectarlo.*

#### Ingreso 3 — Featured Listings (Mes 4+)
| Producto | Precio | Para quién |
|----------|--------|------------|
| Featured Task | $5–$20 por tarea | Clientes con urgencia |
| Featured Freelancer | $15/semana | Freelancers en búsqueda activa |
| Boost de categoría | $50/mes | Top 3 posición en su categoría |

#### Ingreso 4 — B2B API / Enterprise (Mes 9+)
- API de escrow como servicio para empresas que pagan freelancers en cripto
- White-label de la plataforma para ecosistemas corporativos
- Revenue share con Trustless Work por volumen procesado
- AI Agent API: cobro por llamada o por volumen de tareas gestionadas

---

### 2.3 Estrategia GTM — Tres Fases

#### Fase 1 — Base (Mes 1-3): *0 → 500 freelancers activos, $50K GMV*
- **Mercado:** Chile y Argentina — early adopters cripto, mercado conocido
- **Canal principal:** bootcamps tech (Coderhouse, Henry, Desafío Latam)
- **Oferta de lanzamiento:** 0% comisión el primer mes para los primeros 200 freelancers
- **Contenido ancla:** "Cobré mi primer trabajo en cripto sin banco en 5 segundos" (YouTube + Twitter)
- **Categorías foco:** Desarrollo Blockchain, Diseño Web3, Smart Contract Audits

#### Fase 2 — Tracción (Mes 4-9): *→ 5,000 freelancers, $300K GMV/mes*
- **Expansión:** México, Colombia, Perú
- **Lanzamiento ArcusX Verified** ($19 one-time) — primer producto de pago
- **Programa referidos:** $10 USDC por freelancer que complete primera tarea
- **PR:** CoinDesk, Decrypt, The Block — ángulo "el protocolo de trabajo técnico en Web3"
- **Nuevas categorías:** AI/ML Engineering, Traducción técnica, Auditorías

#### Fase 3 — Escala (Mes 10-18): *→ $1M GMV/mes, expansión global*
- **Mercados:** Nigeria, Kenia, Filipinas, Indonesia (alta crypto penetration, fricción bancaria extrema)
- **AI Agent API beta** — primeros agentes autónomos completando bounties
- **Ronda Seed:** $2-3M para equipo regional y marketing
- **App móvil PWA** (ya tienen `vite-plugin-pwa` en el proyecto)
- **Localización:** español, inglés, portugués, swahili

---

### 2.4 Ventaja Competitiva Defensible (Moat)

```
Upwork/Fiverr:    10-20% fee │ pagos 7-14 días  │ banco requerido │ reputación centralizada
Gitcoin/Dework:    variable  │ solo open-source  │ sin KYC         │ DAOs únicamente
ArcusX:              1% fee  │ pagos en 5 seg    │ solo wallet     │ reputación on-chain portable
```

**Los 4 fosos:**
1. **Reputación on-chain portable** — tu historial es tuyo, vive en Stellar, no en nuestros servidores
2. **CertiX como capa de confianza** — única plataforma con verificación de identidad y skills on-chain integrada
3. **Efecto de red bilateral** — más freelancers verificados → más clientes confían → más freelancers vienen
4. **Infraestructura para AI agents** — cuando los agentes necesiten ejecutar trabajo técnico, ArcusX ya estará ahí con el protocolo listo

---

### 2.5 Proyecciones Financieras Actualizadas

| Métrica | Mes 3 | Mes 9 | Mes 18 |
|---------|-------|-------|--------|
| Freelancers activos | 500 | 5,000 | 50,000 |
| GMV mensual | $50K | $300K | $1M |
| Comisión (1%) | $500 | $3,000 | $10,000 |
| Verified badges vendidos | 50 | 500 | 5,000 |
| Ingreso KYC | $950 | $9,500 | $95,000 |
| **Ingreso total mensual** | **$1,450** | **$12,500** | **$105,000** |
| CAC freelancer | <$10 | <$7 | <$5 |
| NPS | >50 | >60 | >70 |
| Churn mensual | <15% | <10% | <7% |
| **Break-even** | | **Mes 14** | |

---

### 2.6 Riesgos y Mitigaciones

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Regulación cripto en LATAM | Media | USDC regulado; estructura legal flexible por país |
| Fricción de onboarding (wallets) | Alta | Tutorial interactivo; Albedo como wallet sin extensión |
| Competidor grande copia el modelo | Media | Velocidad + moat de reputación on-chain; imposible de copiar overnight |
| Bug o hack en contratos escrow | Baja | Trustless Work auditado; bug bounty propio antes de Mainnet |
| AI agents no adoptan el protocolo | Media | Seguimos siendo marketplace humano — los agentes son upside, no core |
| Stellar no escala | Baja | Trustless Work multichain en roadmap; arquitectura adaptable |

---

## 3. Sprint Inmediato de Negocios

| # | Acción | Quién | Estado |
|---|--------|-------|--------|
| 1 | Fee actualizado a 1% en código | CTO | ✅ Hecho |
| 2 | Aplicar grant SDF (hasta $200K) | CEO | 🔲 Pendiente |
| 3 | Diseñar flujo "ArcusX Verified" con CertiX | CPO | 🔲 Pendiente |
| 4 | Publicar comparativa de fees en Twitter/LinkedIn | CMO | 🔲 Pendiente |
| 5 | Contactar 3 bootcamps LATAM para partnership | COO | 🔲 Pendiente |
| 6 | Agregar categorías de tareas al frontend + DB | CTO | 🔲 Pendiente |
| 7 | Entrevistar 10 freelancers LATAM sobre pain points | CPO | 🔲 Pendiente |
| 8 | Completar migración Mainnet (prerequisito GMV real) | CTO | 🔲 En progreso |

---

## 4. La Visión en Una Frase

> *"Somos el protocolo donde el trabajo técnico sucede: escrow trustless, identidad verificable on-chain, pagos en 5 segundos — para el freelancer de Chile y para el agente AI de San Francisco."*

---

*Datos de mercado: Technavio, CB Insights, SkyQuest, AI Agents Directory, Kings Research — Abril 2025.*
*Fee vigente: 1% desde 2026-04-26. Archivo: `arcusx/src/config/trustlessWork.ts`*
