# Changelog

Todos los cambios notables del monorepo **ArcusX** (frontend `arcusx/`, Edge `supabase/functions/`, SDK `packages/arcusx-sdk`) se documentan aquí.

Las entradas siguen espíritu **[Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)**. **Cómo etiquetar y publicar en GitHub Releases:** [docs/RELEASING.md](./docs/RELEASING.md).

---

## 2026-09-24 — v3.8.1 · SOW 3 Week 2 (fund/release prepare-confirm)

**Rama:** `ArcusX3.8` · **Tag:** `v3.8.1` · **Gateway:** `https://api.arcusx.pro` · **Edge:** `arcusx-api` v130

### Agentic / SDK
- Fund/release prepare-confirm en `/v1/subjobs/…/escrow/…` + `client.agent.prepareFund|confirmFund|prepareRelease|confirmRelease|markWorkStarted`
- Smoke 10/10 · `npm run smoke:sow3:week2` / `demo:sow3:week2`
- `requireUser` respeta `partnerId` del router (gateway sin JWT Bearer)
- Packet: `docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK2.md`

### Harness
- `local-test/` prepare fund/release live (unsigned XDR o 4xx tipado)

### Cleanup
- Módulos frontend huérfanos eliminados (admin login deprecado, RatingSystem no cableado, etc.)

### Fuera de este release
- Firmas Freighter → funded/released hashes (Week 3)
- Mainnet

---

## 2026-09-18 — v3.8.0 · SOW 3 Week 1 (agentic jobs)

**Rama:** `ArcusX3.8` · **Tag previsto:** `v3.8.0` · **Gateway:** `https://api.arcusx.pro` · **Edge:** `arcusx-api` v128

### Agentic / SDK

- Baseline machine-callable: partner key → `POST /v1/jobs` (201) → `GET /v1/jobs/{id}` · idempotencia `external_ref`.
- Códigos: `missing_api_key`, `invalid_api_key`, `missing_title`, `invalid_job_id`.
- `@arcusx/sdk` `client.agent.create` / `.get` / `.list` · smoke 9/9 · `npm run demo:sow3:week1`.
- Packet: [`docs/sprints/instaawards-sow3/`](./docs/sprints/instaawards-sow3/).

### Harness

- `local-test/` demo visual del recorrido agentico (auth → job → subjob → quote). Título/descripcion los elige el agente vía SDK; jobs quedan con `partner_id` de la API key.

### Marketplace

- Cards del board: título a ancho completo; badges Testnet/dificultad compactos debajo.

### Fuera de este release

- Fund / release on-chain en el path agentic (Week 2+).
- Mainnet.

---

### Alcance del historial en Git

- La línea de desarrollo que llega a mayo 2026 es la rama **`ArcusX3.6`** (sincronizada con `origin/ArcusX3.6`).
- La rama **`main`** (`origin/main`) en este repositorio puede quedar **atrás** respecto a `ArcusX3.6`; el detalle fino de mayo 2026 vive en **`109916f`** y posteriores sobre esa línea.
- El **primer commit** presente en esta línea es **`de73862`** (**2025-11-23**). Trabajo previo no versionado aquí no aparece en el registro.
- Existe al menos un commit solo en la rama **`ArcusX2.0`**: *Cambios solicitados (algunos)* (`899586c`), no fusionado a `ArcusX3.6`; ver [Apéndice: ramas](#apéndice-ramas-git).

---

## 2026-05-28 — Tranche 2 Q2: cierre Supabase, evidencias, trazabilidad

**Cierre:** [`docs/sprints/TRANCHE2_CLOSURE.md`](./docs/sprints/TRANCHE2_CLOSURE.md) · **Próximos pasos:** [`docs/sprints/POST_TRANCHE2_TODO.md`](./docs/sprints/POST_TRANCHE2_TODO.md)

### Backend / Supabase

- Edge `arcusx-api` v28: `upload_milestone_evidence`, `get_milestone_evidence`, ampliación `domain_events`.
- Edge `arcusx-admin` v15: `get_domain_events`.
- Migración `milestone-evidence` (bucket + tabla).
- Cutover prod documentado; smoke Edge 7/7.

### Frontend

- `EvidenceUpload` activo en `SuperviseTask` (freelancer + vista cliente).
- Admin: pestaña **Actividad** (`AdminActivity.tsx`).
- E2E: [`docs/demo/E2E_CHECKLIST.md`](./docs/demo/E2E_CHECKLIST.md).

### Diferido post–Tranche 2

- B2B org/KYB, growth pack completo, multi-hito, escrow nativo Soroban en prod.

---

## 2026-05-28 — Semana 4 (cierre técnico): i18n, consola, responsive, QA docs

**Detalle:** [`docs/sprints/week-04-changelog-and-architecture.md`](./docs/sprints/week-04-changelog-and-architecture.md) · [`docs/sprints/week-04-technical-close.md`](./docs/sprints/week-04-technical-close.md)

### Frontend

- **i18n:** `ProposalReview` (errores/éxito escrow), `UserProfile` (SEO/alt); `ProtectedRoute` / `SuperviseTask` / `CompleteTaskPopup` ya en `t()`.
- **Logger:** `devError` en `utils/logger.ts`; `trustlessWorkEscrowService`, `ProposalReview`, `CompleteTaskPopup` sin `console.*` en producción.
- **Responsive:** `responsive-critical.css` (touch ≥44px, overflow); chart dashboard `min-width` 280px en 480px.

### Backend / limpieza

- `check_disputes.php` sin referencia a scripts de test (utilities ya ausentes del repo).
- Excepciones documentadas: `week-04-cleanup-exceptions.md`, gaps light: `week-04-light-theme-gaps.md`.

---

## 2026-05-28 — Semana 3 (seguimiento): contraste modo claro en flujos críticos

**Detalle:** [`docs/sprints/week-03-changelog-and-architecture.md`](./docs/sprints/week-03-changelog-and-architecture.md) §3.1 · InstaAwards cierre: [`docs/sprints/instaawards-week4.md`](./docs/sprints/instaawards-week4.md)

### Tema claro — segunda pasada

- Nuevos: **`light-theme-remaining.css`**, **`light-theme-contrast.css`** (import en `main.tsx` tras global/auth/dashboard).
- **`themes.css`:** token `--on-accent` para texto en botones con gradiente.
- Overrides por pantalla: **`ProposalReview.css`** (confirmación, escrow fund/release), **`ApplyTask.css`**, **`FreelancerCard.css`**, **`SuperviseTask.css`** (estado blockchain), **`Hero.css`**, **`Preloader.css`**, **`WalletConnectPopup.css`**, **`SwapCard.css`**, **`UserProfile.css`**, ampliación **`dashboard-light.css`** / **`dashboard.css`**.
- Correcciones: quitar reglas globales `color: #000` que rompían CTAs; `.download-button` ya no fuerza texto blanco en fondo claro; menos inline `#fff` en TSX de escrow/disputas/supervisión.

### Documentación

- Changelog sprint Week 3 actualizado con matriz de smoke en modo claro.
- **InstaAwards Week 4:** plan de cierre y checklist en `docs/sprints/instaawards-week4.md`.

---

## 2026-05-18 — Semana 3: API crítica, Bearer, tema claro, docs reviewer

**Entregable detallado:** [`docs/sprints/week-03-changelog-and-architecture.md`](./docs/sprints/week-03-changelog-and-architecture.md) · Checklist: [`docs/sprints/week-03-plan-and-checklist.md`](./docs/sprints/week-03-plan-and-checklist.md)

### API — contrato JSON en rutas críticas

- **`auth_bearer.php`:** `arcusx_json_success`, `arcusx_json_error`, `arcusx_require_user_id()`.
- **Escritura con JWT:** `apply_task.php` (rewrite + `applicantId` = JWT), `create_task.php` (`user_id` = JWT), `select_proposal.php`, `complete_task.php`, `cancel_task.php`, `create_dispute.php`, `create_escrow.php`, `verify_wallet.php`, `register_wallet.php`.
- **Público:** `get_landing_market_stats.php` — JSON uniforme para Hero.

### Frontend — Bearer automático

- **`config/axios`:** `ApplyTask`, `CreateTask`, `ProposalReview`, `SuperviseTask`, `dashboard`, `privateOffersService`, `cancelTaskService`.

### Tema claro (núcleo 2026-05-18)

- Nuevos: **`auth-surfaces-light.css`**, **`dashboard-light.css`**, **`light-theme-global.css`**, **`ProtectedRoute.css`**.
- Contraste: wallet, filtros, idioma, volver, popups; `Register`/`Login` ya no filtran `.back-button` blanco global.
- *Seguimiento 2026-05-28:* ver entrada anterior (remaining + contrast + flujos escrow/proposals).

### Documentación

- **`docs/api/ENDPOINTS.md`**, **`docs/demo/E2E_TESTNET.md`**, **`docs/sprints/instaawards-week3.md`**.
- **README:** setup local, fuente de stats del Hero, enlaces reviewer.

### Deploy (operaciones)

- Producción: mantener **`.htaccess` del servidor** con `SetEnv` (JWT, DB, Supabase, referidos) — no sustituir por plantilla vacía del repo.
- No commitear `arcusx/.env` ni secretos reales.

---

## 2026-05-15 — Semana 2: API dura (CORS, JWT, wallet)

**Entregable detallado:** [`docs/sprints/week-02-changelog-and-architecture.md`](./docs/sprints/week-02-changelog-and-architecture.md) · Checklist: [`docs/sprints/week-02-plan-and-checklist.md`](./docs/sprints/week-02-plan-and-checklist.md)

### Single CORS allowlist

- **`backend_externo/cors.php`:** allowlist única (localhost, arcusx.pro, empresas.*); **`ARCUSX_CORS_EXTRA_ORIGINS`** opcional; sin `*`.
- Todos los endpoints PHP del API público migrados a `arcusx_cors_handle_preflight` / `arcusx_cors_apply`.
- **`admin_common.php`:** CORS admin delega en `arcusx_cors_origin_for_request()`.

### Consistent API responses

- **`auth_bearer.php`:** `arcusx_jwt_user_id`, `arcusx_json_exit`, Bearer unificado en ~30 rutas de usuario.
- **`update_user.php`:** 401 / 403 + prepared statements (identidad JWT = `id` del body).
- **`get_platform_fee.php`:** público, sin JWT. **`confirm_escrow_signature.php`:** **410 Gone**.

### Secrets & JWT at the edge

- **`config.php`:** `ARCUSX_DB_PASSWORD` y `ARCUSX_JWT_SECRET` vía `getenv()`; plantilla **`SetEnv`** en `.htaccess` / **`.env.example`**.
- **Supabase Edge:** `php-admin-jwt.ts` + **`referral-admin`** validan el JWT de `admin_login.php` con el mismo secreto en Edge Secrets (no en `VITE_*`).

### Extend the wallet surface

- **`register_wallet.php` / `verify_wallet.php`:** CORS + JWT alineados.
- **`EditProfile`:** verificar / registrar wallet; i18n **`edit.wallet.*`**.
- **`useWallet`:** Freighter + xBull; auto-`registerWallet` al conectar; **`ApplyTask`** sigue usando `verifyWallet` al postular.

### Añadido (producto, misma ventana)

- **Flujo contratar freelancer:** query `hire_*` en `/create-task`, popup con enlace a postular — ver **`docs/plans/freelancer-hire-flow-improvement.md`**.

---

## 2026-05-07 — Estabilidad backend, OAuth, enterprise, wallet e i18n

**Commit de referencia:** `109916f` (*week 1 & progress of week 2*).

### Añadido

- **`backend_externo/cors.php`** y adopción sistemática en endpoints PHP para una política CORS coherente entre orígenes permitidos.
- Documentación de migración futura: **`MIGRATION_SUPABASE.md`** (plan hacia PostgreSQL + Supabase).
- Bloque en **`backend_externo/.htaccess`** con **`SetEnv`** de ejemplo para **`ARCUSX_DB_PASSWORD`** y **`ARCUSX_JWT_SECRET`** (valores reales solo en servidor, no en el repositorio).
- Flujo **empresas**: un solo CTA de acceso en navbar; en host `empresas.*` **`/register`** redirige a **`/login`**; textos específicos **`empresa.login.*`** (ES / EN / PT).
- Soporte de **varias wallets Stellar** en el flujo de conexión (además de Freighter), con UI y estilos actualizados.
- **Tutoriales:** modelos de contenido y textos también en **portugués** donde aplica.

### Cambiado

- **`config.php`:** lectura correcta de secretos vía **`getenv('ARCUSX_DB_PASSWORD')`** y **`getenv('ARCUSX_JWT_SECRET')`**.
- **`sync_supabase_user.php`:** `username` legible por defecto; sufijo derivado del UUID de Supabase solo si hay **colisión** de nombre.
- **Login / Register:** pantallas centradas en **Google y GitHub**; ajustes en estilos públicos y variante enterprise.
- **`useWallet`**, **`WalletConnectPopup`**, **`WalletButton`:** alineación multiproveedor y mensajes de usuario.
- **`ApplyTask`:** experiencia de wallet al postular (precarga / pegar wallet conectada según implementación en rama).
- **`ProposalReview`** / **`UserProfile`:** navegación de vuelta desde perfil público hacia propuestas mediante estado de ruta.
- **`dashboard`:** enlaces de historial de transacciones hacia la vista de tarea/postulación donde corresponda.
- **`SuperviseTask`**, **`DisputeManagement`**, **`AdminPanel`**, estilos relacionados: trabajo sustancial en supervisión, disputas y panel.
- **i18n:** ampliación de claves (paginación admin, perfil, empresas, wallet, etc.).
- **Tipografía / caracteres:** **`App.css`** e **`index.html`** (fuentes / subset) orientados a mejor render de **ñ** y latin extended.
- **`arcusx/.env.example`**, **`CLAUDE.md`**, **`MEMORIA_VITAL_ARCUSX.md`:** alineados con el estado del proyecto.

### Corregido / Operaciones

- Deploy de SPA: subir **`index.html` y `/assets`** coherentes (mismos hashes) al publicar; ante **Cloudflare**, hacer **purge de caché** si los assets con hash devolvían 404 (p. ej. logo claro en `empresas.*`).

### Seguridad

- Reducción del **wildcard CORS** disperso en favor de helper compartido y allowlist.
- Separación de secretos de base de datos y JWT del código fuente (variables de entorno en runtime).

---

## 2026-04-30 — Infraestructura de tooling y “week 1”

**Commit de referencia:** `15adb8b` (*week 1*).

### Añadido

- Amplio conjunto de configuración y plantillas bajo **`.claude/`**, **`.agents/`**, **`.claude-flow/`** (agentes, métricas, documentación de capacidades) orientado a desarrollo asistido; no sustituye código de producto pero forma parte del árbol versionado en este hito.

### Cambiado

- Ajustes continuos heredados del histórico hasta `7fce2c6` sin commits etiquetados intermedios en abril en esta línea.

---

## 2026-03-29 — Preparación “business ready”

**Commit:** `7fce2c6` (*update business ready*).

### Cambiado

- Consolidación orientada a uso comercial / demo (detalle en diff del commit).

---

## 2026-03-21

**Commit:** `d568496` (*update*).

### Cambiado

- Mantenimiento y ajustes varios en producto.

---

## 2026-03-04

**Commit:** `b189882` (*update*).

### Cambiado

- Iteración incremental pre–marzo fino.

---

## 2026-02-21

**Commit:** `c48b82c` (*fixes*).

### Corregido

- Correcciones puntuales tras la ronda de febrero.

---

## 2026-02-20

**Commit:** `70b11bb` (*update*).

### Cambiado

- Actualización general.

---

## 2026-02-13

**Commit:** `d82029b` (*update*).

### Cambiado

- Continuación de traducciones y ajustes UI.

---

## 2026-02-06

**Commit:** `b5562d1` (*translate update*).

### Cambiado

- Refinamiento de internacionalización.

---

## 2026-02-05

**Commits:** `72472f6` (*fixes on upload*), `9446234` (*update*).

### Corregido

- Problemas relacionados con **subida de archivos** y flujos dependientes.

### Cambiado

- Mejoras complementarias el mismo día.

---

## 2026-02-04

**Commit:** `e7fdf47` (*update 3.2*).

### Cambiado

- Paquete de cambios etiquetado como 3.2 en el mensaje de commit.

---

## 2026-01-24

**Commit:** `1bfdf28` (*cambios*).

### Cambiado

- Ajustes diversos de enero.

---

## 2026-01-22

**Commits:** `41d4cfd` (*bot update*), `df365ae` (*update*).

### Añadido / Cambiado

- Trabajo relacionado con **asistente / bot** y actualizaciones generales.

---

## 2026-01-16

**Commits:** `9d2f664` (*update sistema de rating*), `5812b39` (*soroswap + seccion tutoriales*).

### Añadido / Cambiado

- Evolución del **sistema de ratings**.
- **Tutoriales** y **Soroswap** en el mismo tramo de historia publicada.

---

## 2026-01-14

**Commit:** `0876ff3` (*integracion soroswap*).

### Añadido

- Integración de **Soroswap** para intercambio **XLM ↔ USDC** dentro del ecosistema de la app.

---

## 2026-01-10

**Commit:** `951c179` (*comienzo seccion tutoriales*).

### Añadido

- Inicio formal de la **sección Tutoriales**.

---

## 2026-01-09

**Commit:** `145e881` (*modo oscuro/claro*).

### Añadido

- **Tema claro / oscuro** con base en variables CSS y contexto de aplicación.

---

## 2026-01-08

**Commits:** `d25d28d` (*profile*), `90db30f` (*update freelance market*).

### Añadido / Cambiado

- Perfil de usuario y refinamiento del **mercado freelance**.

---

## 2026-01-07

**Commits:** `7117176` (*update de arqui*), `445396f` (*update*), `6090bc8` (*update + seccion freelancers*).

### Añadido / Cambiado

- Documentación de arquitectura y sección **Freelancers**.
- Actualizaciones paralelas de soporte.

---

## 2026-01-06

**Commit:** `7c829b8` (*ingles/espanol*).

### Añadido

- Bases de **inglés / español** en la experiencia (i18n temprano).

---

## 2026-01-04

**Commits:** `b764142` (*update*), `8e96295` (*limpieza*).

### Cambiado

- Limpieza de repositorio y actualización; en esta línea **`b764142`** es el ancestro común tras el cual `ArcusX3.6` incorpora ~26 commits hasta mayo 2026.

---

## 2025-12-28

**Commits:** `da48961` (*update*), `01cdae4` (*update y fix*).

### Cambiado / Corregido

- Cierre de año: fixes y actualizaciones varias.

---

## 2025-12-20

**Commit:** `957fa0e` (*arreglos supervisar*).

### Corregido

- Ajustes en flujo **SuperviseTask** / supervisión.

---

## 2025-12-18

**Commit:** `1b2223c` (*eliminar node module de repo*).

### Cambiado

- Eliminación de **`node_modules`** versionado por error; mejora de higiene del repositorio.

---

## 2025-12-16

**Commits:** `ba412b9` (*plan seg de cancel supervise*), `36f1fbb` (*contador ganancias t*).

### Añadido / Cambiado

- Planificación de comportamiento ante **cancelación** en supervisión.
- Contador / resumen relacionado con **ganancias** en tareas.

---

## 2025-12-15

**Commits:** `12f00e7` (*diseño login*), `54c821c` (*max*).

### Cambiado

- Renovación visual del **login** y cambios complementarios (“max” en mensaje de commit).

---

## 2025-12-10

**Commit:** `86a1967` (*update*).

### Cambiado

- Actualización intermedia.

---

## 2025-12-08

**Commit:** `6d89033` (*pre casi fin*).

### Cambiado

- Preparación cercana a cierre de fase dic-2025.

---

## 2025-12-07

**Commits:** `fd1e39c` (*Update README.md*), `53be97e` (*logo readme*), `5a6fe07` (*pre finiquitado*), `210982d` (*jijija*), `46e18dc` (*fine*).

### Añadido / Cambiado

- README, logo documentado y cierres previos del bloque de desarrollo inicial.

---

## 2025-12-05

**Commits:** `f9058c6`, `de1e6ec`, `65eb282`, `8dcc6e4` (mensajes abreviados en historial).

### Cambiado

- Commits intermedios tempranos de diciembre 2025 sobre la línea principal del proyecto.

---

## 2025-11-23

**Commit:** `de73862` (*owao*) — inicial en esta genealogía.

### Añadido

- Arranque del repositorio ArcusX en el registro Git disponible (`git log ArcusX3.6 --reverse`).

---

## Apéndice: ramas Git

| Rama (local / `origin`) | Notas |
|-------------------------|--------|
| `ArcusX3.6` | Línea con el estado más reciente documentado hasta **2026-05-07**. |
| `main` | Puede no incluir los últimos ~26 commits de producto hasta fusionar desde `ArcusX3.6`. |
| `ArcusX2.0` | Contiene **`899586c` — Cambios solicitados (algunos)**, ausente en `ArcusX3.6`; revisar si debe portarse o descartarse. |
| `ArcusX2.1`, `ArcusX3.0`, `ArcusX3.4`, `ArcusX3.5`, `arcus3.1`, `arcusx3.2`, `falla-v1` | Ramas de trabajo / experimentación histórica; usar `git log <rama>` para comparar. |

### Comando útil para auditar una semana concreta

```bash
git fetch --all
git log origin/ArcusX3.6 --since='2026-05-01' --until='2026-05-08' --pretty=format:'%h %ad %s' --date=short
```

---

*Última revisión manual de este changelog: 2026-05-07.*
