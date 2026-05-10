# ArcusX × CertiX — Análisis del modelo de negocio (propuesta Cloud)

Documento de trabajo para alinear la propuesta de **suscripción por tiers + take rate por volumen + bundling CertiX** con el estado real del producto y planificar implementación.

**Referencia:** propuesta informal (“flywheel” Free / Pro / Verified / Studio-Agency con precios orientativos y rollout por fases).

---

## 1. Resumen de la propuesta

**Dos motores de ingreso que se refuerzan:**

| Motor | Rol |
|-------|-----|
| **Suscripción (MRR)** | Ingresos recurrentes predecibles por tier. |
| **Take rate sobre transacciones** | Escala con GMV en el marketplace (escrow). |

**Bundling CertiX:** el tier superior no solo baja el fee de ArcusX; incluye **emisión de certificados on-chain** como beneficio tangible (verificación con valor económico vs. solo “badge”).

**Tabla propuesta (orientativa, no contractual):**

| Tier | Precio (referencia) | Fee ArcusX | CertiX incluido |
|------|---------------------|------------|-------------------|
| Free | $0 | 3% | — |
| Pro | ~$12/mes | 2% | 1 cert/mes |
| Verified | ~$29/mes | 1.5% | 5 certs/mes + badge |
| Studio / Agency | ~$99/mes | 1% | Emisión masiva (B2B) |

**Secuencia recomendada por Cloud:** no lanzar los cuatro tiers a la vez → **primero Free + Verified**, validar que la gente paga por el descuento de fee; **luego** Studio cuando exista demanda B2B real; Pro como paso intermedio opcional según datos.

---

## 2. Visión producto: CertiX → ArcusX (sync, badge único, descubrimiento)

**Principio:** la **fuente de verdad** del certificado es **CertiX** (subida y verificación allí). Una vez el certificado está **verificado**, debe volverse **visible en ArcusX** sin obligar al usuario a volver a subir el mismo archivo manualmente en el marketplace.

### 2.1 Flujo resumido

1. El usuario gestiona y verifica credenciales en **CertiX**.
2. Al pasar a estado **verificado**, se dispara la **sincronización hacia ArcusX** (idealmente **en vivo** vía API).
3. En **ArcusX**, el perfil público refleja esa confianza de forma clara para clientes y visitantes.

### 2.2 Dónde se “busca” o consulta

- **CertiX:** búsqueda y verificación detallada del documento / registro on-chain (caso de uso “quiero validar este certificado”).
- **Perfil público en ArcusX:** mismo usuario puede mostrar de un vistazo que **tiene certificaciones verificadas**; quien contrata puede **confiar desde el perfil** sin salir del funnel de hiring.

Objetivo: **dos entradas legítimas** al dato (CertiX = verdad técnica; ArcusX = reputación en el marketplace).

### 2.3 Regla de UI: un badge agregado, muchos certificados

Si una persona tiene **muchos** certificados (p. ej. decenas, distintas empresas u organismos), **no** se pintan decenas de iconos en el perfil.

- En el perfil público de ArcusX se muestra **un solo indicador agregado** (p. ej. badge tipo “Certificaciones verificadas” / bandera única) con **conteo** o copy del estilo “N certificaciones”.
- El **detalle** (lista por emisor, fecha, enlace a verificación en CertiX) vive en **segundo nivel**: modal, pestaña “Credenciales”, o redirección a CertiX según contexto.

Esto mantiene el perfil limpio y escalable con 5 o 50 credenciales.

### 2.4 Sincronización: API “en vivo”

- **Preferido:** eventos **push** (webhook o cola) desde CertiX cuando cambia el estado de un certificado → ArcusX actualiza cache / perfil en **tiempo casi real**.
- **Respaldo:** polling periódico o sync on-profile-load si el canal en vivo falla.
- **Identidad:** mismo vínculo usuario CertiX ↔ ArcusX (OAuth / id estable / wallet según modelo ya definido) para no mezclar credenciales entre cuentas.

### 2.5 Implicaciones para el modelo de negocio (§1)

El tier **Verified** y el bundling CertiX cobran más sentido cuando el usuario **ve** en ArcusX el resultado de CertiX sin fricción: menos fee + **reputación visible** sincronizada.

---

## 3. Encaje con ArcusX hoy (código y configuración)

### 3.1 Take rate ya contemplado en configuración

En `arcusx/src/config/trustlessWork.ts` y `arcusx/src/config/commission.ts` el producto ya define:

- **Fee base de plataforma:** `PLATFORM_FEE_BPS = 3.0` (3%).
- **Fee reducido CertiX Verified:** `PLATFORM_FEE_BPS_CERTIX = 1.5` y `CERTIX_COMMISSION_RATE = 0.015` (1.5%).

Eso **coincide con la fila “Free 3%” y “Verified 1.5%”** de la tabla de Cloud a nivel de porcentajes — **pero** la propuesta añade **Pro 2%** y **Studio 1%**, que hoy **no** están modelados como constantes de negocio ni como reglas de usuario.

### 3.2 Dónde se aplica el fee en la UI

El fee visible y usado en flujos de escrow/comisión pasa por `usePlatformFee` → `getPlatformFee()` (`platformFeeService.ts`), con fallback por defecto **0.3% (0.003)** cuando no hay token o no responde el backend — **desalineado** con el 3% documentado en `trustlessWork.ts` y con la narrativa de negocio.

**Implicación para el modelo:** antes de vender tiers por “ahorro en fee”, hay que **unificar fuente de verdad**: mismo porcentaje en creación de escrow (Trustless Work), UI, y backend (`get_platform_fee.php` / admin config), y **mapear tier de usuario → fee efectivo** (incl. CertiX verified).

### 3.3 CertiX como producto separado

CertiX vive en el monorepo como app aparte (Next.js). El bundling “certs/mes” implica:

- **Producto:** límites por tier, posible **API key** o **cupón / crédito** hacia CertiX, o consolidación de facturación en ArcusX con reparto interno.
- **Ops:** quién soporta emisión masiva (Studio) — soporte, SLA, abuso.

### 3.4 Suscripciones

**No** hay hoy en el repositorio un módulo de billing tipo Stripe/RevenueCat documentado como estándar para ArcusX; el modelo MRR **es nuevo** a nivel de implementación.

---

## 4. Valoración económica de la propuesta

### 4.1 Fortalezas

- **ROI explícito para Verified:** el ejemplo de Cloud ($3.000/mes de volumen → ahorro ~$45/mes vs 3%) hace que **$29/mes** sea defendible si el usuario ya opera volumen; validación empírica con cohortes.
- **Studio** apunta a **B2B** (empleadores que certifican a muchos empleados): ARPA alto, menos dependencia del freelance sporádico; comparación favorable vs Credly/Accredible si el volumen de certificados crece.
- **Flywheel:** MRR suaviza burn mientras el take rate crece con GMV; CertiX diferencia el tier superior frente a marketplaces genéricos.

### 4.2 Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **Caguero en fee** (usuarios de alto volumen sin subscription) | Fee vigente al **crear** escrow; política clara de upgrades mid-contract si aplica. |
| **Complejidad de 4 tiers** | Rollout escalonado (Cloud): Free + Verified primero; Pro/Studio después. |
| **Costo marginal CertiX** (gas, almacenamiento, revisión) | Límites duros por tier; overage con precio por certificado. |
| **Doble contabilidad** ArcusX vs CertiX | Definir **un** sistema de “créditos” o API contract entre productos. |
| **Regulación / pagos** suscripción LATAM | Pasarela, impuestos, facturación — fase de discovery legal/contable. |

### 4.3 Coherencia de porcentajes

- **Pro 2%** y **Studio 1%** son incentivos fuertes: validar que el **margen** tras costos (Trustless Work, infra, CertiX) sigue siendo sostenible.
- **1%** en Studio puede ser correcto para anclar cuentas enterprise; vigilar **canibalización** (freelancers grandes que se pasan a Studio sin ser “agency” real) — reglas de elegibilidad o volumen mínimo.

---

## 5. Plan por fases (objetivos de producto)

### Fase A — Fundamentos (sin vender aún Pro/Studio)

1. **Single source of truth del fee:** alinear `platformFeeService` / admin / Trustless Work con **3% base** y **1.5% CertiX verified** según reglas de negocio acordadas.
2. **Estado de usuario:** campo o servicio “subscription_tier” + “certix_verified” (o equivalente) consumible en frontend al crear escrow.
3. **Pricing page + checkout** (una pasarela): empezar con **Verified** como único pago recurrente opcional, cruzado con beneficio 1.5% + paquete CertiX acotado.
4. **API CertiX → ArcusX:** contrato de sync (webhook + usuario enlazado); perfil público con **badge agregado** y vista detalle para lista / enlaces a CertiX.

### Fase B — Validación (Free + Verified)

1. Medir: conversión a Verified, **GMV por cohorte**, LTV vs CAC del canal (embajadores, influencers).
2. A/B en copy: ahorro mensual estimado según historial o slider de volumen.
3. Definir **límites CertiX** (5 certs/mes) y proceso cuando se excede.

### Fase C — Pro

Introducir **Pro ~$12** solo si los datos muestran hueco entre Free y Verified (usuarios que no justifican Verified pero sí quieren 1 cert/mes o fee intermedio).

### Fase D — Studio / Agency

Requisitos sugeridos antes de lanzar: pipeline B2B, contrato tipo, volumen mínimo de certificados o empleados, y soporte.

---

## 6. Checklist de decisiones pendientes (negocio)

- [ ] Precios finales y moneda (USD vs local).
- [ ] Reglas exactas: ¿Verified exige KYC/CertiX aprobado permanente o solo “plan activo”?
- [ ] ¿Fee del cliente o del freelancer? (hoy el modelo económico del escrow debe ser consistente con cómo se muestra el “worker amount” vs total.)
- [ ] Política de reembolso y cambio de tier a mitad de mes.
- [ ] Revenue share interno ArcusX ↔ CertiX por certificado incluido.
- [ ] Privacidad: qué campos del certificado son públicos en ArcusX vs solo visibles al cliente con el proyecto abierto.
- [ ] SLA de sync “en vivo”: degradación aceptable si CertiX o ArcusX están caídos.

---

## 7. Conclusión

La propuesta de Cloud es **coherente** con la dirección del producto (Stellar + escrow + CertiX como capa de confianza) y **parcialmente alineada** con constantes ya definidas (3% / 1.5% CertiX). La **visión de producto** (§2): fuente de verdad en CertiX, **sync preferente en vivo**, perfil ArcusX con **badge agregado** y descubrimiento en CertiX o en el perfil público, es la columna vertebral del diferencial frente a marketplaces genéricos. Para ejecutar el modelo hace falta: **(1)** corregir desalineaciones técnicas del fee en app, **(2)** introducir **billing y modelo de datos de suscripción**, **(3)** **API/webhooks CertiX ↔ ArcusX** y políticas de privacidad del listado detallado, **(4)** acordar **integración operativa** CertiX para créditos por tier, y **(5)** seguir el **rollout escalonado** para no sobrecargar producto y soporte.

---

*Documento interno de estrategia. Los precios y porcentajes de la tabla son referencia de diseño; las cifras contractuales y fiscales deben validarse con el equipo antes de publicación.*
