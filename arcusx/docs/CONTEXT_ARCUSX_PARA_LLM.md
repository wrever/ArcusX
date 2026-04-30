# Contexto ArcusX — estado actual, stack y visión (para LLM / terceros)

Documento pensado para **pegar como contexto** en ChatGPT u otra IA, o para briefings. Actualizar cuando cambien hitos o proveedores.

---

## 1. Qué es ArcusX (categoría honesta)

- **No es “SaaS clásico”** en el sentido de herramienta B2B puramente interna (tipo CRM o gestor de proyectos sin lado “oferta” de mercado). ArcusX es **plataforma bilateral**: hay **quien encarga trabajo** y **quien lo ejecuta**.
- **Descripción precisa hoy:** *marketplace de tareas / encargos* con **flujo completo** (publicación → postulaciones/propuestas → selección → supervisión → cierre) y **pagos con lógica de escrow** (Trustless Work + red Stellar / USDC en la práctica del producto).
- **Dirección estratégica (visión):** evolucionar hacia **infraestructura de cumplimiento de tareas para empresas**: interfaz y reglas B2B para quien encarga, **red compartida** de ejecutores (marketplace como **motor de suministro**, no como etiqueta principal hacia fuera).
- **Pitch externo recomendado:** enfatizar **“encargos técnicos / ejecución y liquidación”** para equipos (fintech, pagos, crypto, ops); evitar titular *“somos un marketplace de freelancers”* si el ICP es empresa.

---

## 2. Stack y piezas técnicas relevantes (frontend / repo)

- **Frontend:** React 19, Vite, TypeScript, React Router.
- **Blockchain / pagos:** Stellar (`@stellar/stellar-sdk`), **Trustless Work** (`@trustless-work/escrow`, `TrustlessWorkConfig` en `App.tsx`), Stellar Wallets Kit, Soroswap SDK (swap en app).
- **Backend / datos:** Supabase (`@supabase/supabase-js`) — detalles de esquema no documentados aquí.
- **UI:** Chakra UI, temas claro/oscuro, variante `data-app-variant="enterprise"` para experiencia “Empresas” corporativa.
- **i18n:** traducciones en app (ES / EN / PT entre otros).
- **Despliegue:** build estático Vite; referencias a cPanel en rutas.

---

## 3. Rutas y flujos principales (producto actual)

| Ruta (aprox.) | Qué es |
|---------------|--------|
| `/` | En **dominio público:** landing principal (`Hero`) + `Navbar`. En **subdominio empresas** (`isEnterpriseLandingHost`): landing B2B (`EmpresasPage`) + `EmpresasNavbar`. |
| `/empresas` | Misma landing B2B en sitio público (sin duplicar subdominio). |
| `/login`, `/register` | Auth; en host empresas llevan navbar empresas. |
| `/auth/callback` | Callback OAuth. |
| `/dashboard` | Panel usuario (protegido). Variante enterprise en UI. |
| `/create-task` | Crear encargo/tarea (protegido). |
| `/apply-task/:taskId` | Postular a tarea (protegido). |
| `/proposals/:taskId` | Revisión de propuestas (protegido). |
| `/supervise-task/:taskId/:acceptedApplicantId` | Supervisión / ciclo de trabajo (protegido). |
| `/profile/:userId` | Perfil público. |
| `/dashboard/settings/profile` | Editar perfil (protegido). |
| `/swap` | Página swap (Soroswap / Stellar). |
| `/tutoriales` | Tutoriales. |
| `/admin/*` | Panel admin. |

Flujo núcleo negocio: **crear tarea → aplicaciones/propuestas → aceptar ejecutor → escrow/funding → trabajo → aprobación/liberación** (con popups y servicios asociados en el código).

---

## 4. Empresas / B2B en producto

- **Landing dedicada:** `EmpresasPage` (CSS propio + variante subdominio `ax-empresas--subdomain`).
- **Config:** `enterpriseSite`, URLs de portal, host de landing empresas vs público.
- **Narrativa:** contratar por tarea, escrow USDC, interfaz profesional para inversores/clientes empresa.
- **Design partner mencionado en estrategia:** Alfred Pay (pagos internacionales, on/off ramp crypto) — validación de necesidad de capa empresa; tracción y respuesta comercial variable.

---

## 5. Estrategia de mercado (resumen)

- **ICP orientativo:** startups / fintech / equipos crypto que necesitan **tareas técnicas o operativas acotadas** sin contratar FTE ni procesos largos de selección.
- **Oferta (supply):** foco en **perfiles técnicos** (programadores, ingeniería informática, redes, etc.), con canal universitario + profesionales (LinkedIn, redes).
- **Calidad:** brief claro, hitos, escrow, supervisión, reputación; roadmap: **KYC externo**, **badges automáticas** (ej. al aprobar KYC), wallet más simple.
- **Feedback externo (CEO Trustless Work, documentado en `productfeedback.md`):** el diferencial defendible es **interfaz dedicada para empresas + red compartida de ejecución**, no comisiones bajas como único gancho; conviene **foco** (un tipo de empresa, un tipo de tarea, un flujo repetible) antes de monetización prematura tipo suscripciones masivas.

---

## 6. Roadmap técnico / producto (planificado, no todo implementado)

Documentado en `docs/PLAN_WALLET_EMBEDDED_KYC_BADGES.md`:

- **Wallet embebida:** proveedor por definir (ej. Privy, Crossmint); login social (Google) → wallet asociada; política de **no recuperación de cuenta Google por soporte rutinario** (recuperación vía IdP).
- **KYC:** proveedor **externo**; posible tier gratuito limitado; umbrales por tipo de acción.
- **Badges:** mayormente **automáticas** por eventos (`kyc.approved`, `task.completed`, etc.).
- **Ambición de equipo:** ventana ~**6 meses** con posible ampliación de equipo y **mainnet** — sujeto a alcance, seguridad, compliance y proveedores; no es compromiso de este documento.

---

## 7. Cómo NO etiquetar el proyecto (evitar confusiones)

| Etiqueta | Uso |
|----------|-----|
| **“SaaS” solo** | Engañoso si se omite el **lado marketplace** y el **matching**; mejor *“SaaS + marketplace”* o *“plataforma B2B2C”*. |
| **“Infraestructura”** | Válido como **visión** o si el producto ya es el **sistema por defecto** para un flujo repetible con integraciones; **hoy** es más exacto decir *“camino hacia infra de cumplimiento de tareas”*. |
| **“Marketplace genérico”** | Debilita posicionamiento si el nicho es **técnico + empresa + pagos on-chain**. |

---

## 8. Archivos útiles en repo

- `arcusx/docs/PLAN_WALLET_EMBEDDED_KYC_BADGES.md` — wallet, KYC, badges, fases.
- `arcusx/docs/PLAN_ELEVACION_BACKEND_STACK.md` — backend (si aplica).
- `arcusx/docs/SUBDOMINIO_EMPRESAS.md` — empresas.
- `productfeedback.md` (raíz del repo) — feedback estratégico Trustless CEO.

---

*Última actualización: contexto consolidado para uso en LLM; revisar fechas y métricas reales al compartir con inversores.*
