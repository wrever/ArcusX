# Plan de diseno UX/UI - ArcusX Empresas

## Objetivo
Crear una experiencia enterprise clara, sobria y profesional, enfocada en crear y supervisar tareas, manteniendo la logica actual y endpoints vigentes.

## Principios de diseno
- Modo claro obligatorio en empresas.
- Prioridad a legibilidad, jerarquia y confianza visual.
- Color psicologico orientado a negocio:
  - Azul corporativo: control y confiabilidad.
  - Teal/acento: accion y confirmacion.
  - Verde: estado exitoso y fondos.
  - Naranjo/rojo: alertas y riesgo.
- Microinteracciones discretas, sin efectos excesivos.

## Sistema visual enterprise
- Definir tokens visuales unificados para empresas:
  - `--ax-ent-bg`, `--ax-ent-surface`, `--ax-ent-border`, `--ax-ent-text`, `--ax-ent-primary`.
- Aplicar tokens por alcance de host: `data-app-variant="enterprise"`.
- Estandarizar:
  - botones CTA,
  - formularios,
  - tarjetas,
  - estados (success/warning/error),
  - sombras y radios.

## Flujos clave a optimizar
1. Home empresas (`/`)
   - Propuesta de valor, CTA a login/registro, foco en gestion de tareas.
2. Login y registro empresas
   - Mensajes de confianza y acceso corporativo.
3. Dashboard empresas
   - Navegacion reducida: crear + supervisar + notificaciones + ajustes.
   - KPI operativos de tareas visibles.
4. Crear tarea (`/create-task`)
   - Formulario mas claro por bloques y validaciones visibles.
5. Propuestas y supervision (`/proposals/:id`, `/supervise-task/:id/:acceptedApplicantId`)
   - Estados de proceso, acciones primarias y trazabilidad.

## Backlog UX por etapas
### Etapa 1 (ya aplicada)
- Normalizacion visual enterprise en claro para dashboard, crear, propuestas y supervision.
- Refuerzo de consistencia en botones, inputs, tarjetas y mensajes.
- Forzado de tema claro en subdominio empresas.

### Etapa 2
- Reordenar la informacion de dashboard por prioridades (pendientes, bloqueadas, en revision).
- Mejorar jerarquia tipografica en formularios largos.
- Reduccion de ruido visual en secciones secundarias.

### Etapa 3
- Estados vacios premium (sin tareas, sin propuestas, sin actividad).
- Sistema de badges de SLA (en tiempo, riesgo, atraso).
- Mejoras de accesibilidad (contraste AA y focus visibles en todo el flujo).

## QA y criterios de salida
- Contraste AA en vistas principales enterprise.
- No deben existir componentes oscuros en empresas.
- Flujo completo validado:
  - login/registro,
  - crear tarea,
  - ver propuestas,
  - supervision y cierre.
- Test visual rapido en desktop y mobile.

## Riesgos y mitigacion
- Riesgo: estilos legacy con `!important` generen inconsistencias.
  - Mitigacion: capa enterprise global con scope por host y pruebas por pantalla.
- Riesgo: regresion en sitio general.
  - Mitigacion: todo scopeado a `data-app-variant="enterprise"`.
- Riesgo: deuda de estilos duplicados por componente.
  - Mitigacion: centralizar en tokens y reducir overrides por etapa.
