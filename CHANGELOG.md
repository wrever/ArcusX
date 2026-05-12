# Changelog

Todos los cambios notables del monorepo **ArcusX** (frontend `arcusx/`, backend `backend_externo/`, docs) se documentan aquí.

Las entradas siguen espíritu **[Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)**. **Cómo etiquetar y publicar en GitHub Releases:** [docs/RELEASING.md](./docs/RELEASING.md).

### Alcance del historial en Git

- La línea de desarrollo que llega a mayo 2026 es la rama **`ArcusX3.6`** (sincronizada con `origin/ArcusX3.6`).
- La rama **`main`** (`origin/main`) en este repositorio puede quedar **atrás** respecto a `ArcusX3.6`; el detalle fino de mayo 2026 vive en **`109916f`** y posteriores sobre esa línea.
- El **primer commit** presente en esta línea es **`de73862`** (**2025-11-23**). Trabajo previo no versionado aquí no aparece en el registro.
- Existe al menos un commit solo en la rama **`ArcusX2.0`**: *Cambios solicitados (algunos)* (`899586c`), no fusionado a `ArcusX3.6`; ver [Apéndice: ramas](#apéndice-ramas-git).

---

## 2026-05-09 — Semana 2: JWT unificado y wallet en perfil

### Cambiado

- **`backend_externo`:** la autenticación por JWT de la app (Bearer) se centraliza en **`auth_bearer.php`** (`arcusx_jwt_user_id`, etc.) en los endpoints que aún duplicaban `JWT::decode`; el panel admin sigue usando su validación en **`admin_common.php`**.
- **`get_platform_fee.php`:** deja de cargar `vendor` solo para JWT no usado; respuesta GET sin dependencia de Firebase.
- **`confirm_escrow_signature.php`:** solo respuesta **410 Gone**; eliminado código inalcanzable tras `exit`.
- **`manage_portfolio.php`:** carga correcta de `vendor` + `auth_bearer` (sin `use` inválido dentro de `if`).

### Añadido

- **`EditProfile`:** sección Stellar (verificar / registrar wallet) con i18n **`edit.wallet.*`**.
- **Flujo «contratar / encargar tarea» (freelancers):** query `for_user` / `hire_username` / `hire_skill` en **`/create-task`** como respaldo al refrescar; sugerencia de **categoría** desde la skill; popup de éxito con **enlace a postular** (`/apply-task/{id}?ref=hire`) y **copiar al portapapeles**; **`Popup`** admite contenido extra; **`FreelancerCard`** y **`UserProfile`** (banner) navegan con `state` + query; **`ApplyTask`** muestra aviso si `ref=hire`. Ver **`docs/plans/freelancer-hire-flow-improvement.md`**.

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
