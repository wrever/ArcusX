# Plan de rediseño – ArcusX Website

**Objetivo:** Diseño profesional y pulido, estilo Web3 gaming ultra HD (negro + verde eléctrico), para impresionar a Stellar Chile y reflejar una plataforma seria y moderna.

**Contexto:** Stellar Chile puede aceptar el proyecto; piden más usuarios, mejores números de marketing y un rediseño de branding/diseño porque el sitio actual se ve antiguo, default o muy básico.

---

## 1. Nuevo sistema de diseño (Design System)

### 1.1 Paleta principal – Negro + verde eléctrico

| Uso | Variable | Valor | Notas |
|-----|----------|--------|--------|
| Fondo principal | `--bg-base` | `#0a0a0a` / `#0d0d0d` | Negro puro o casi negro |
| Fondo elevado | `--bg-surface` | `#141414` / `#1a1a1a` | Cards, secciones |
| Fondo glass | `--bg-glass` | `rgba(20, 20, 20, 0.7)` | Efecto glassmorphism |
| Acento principal | `--primary-blue` | `#10dd88` | Verde eléctrico (menos neón, misma esencia) |
| Acento secundario | `--secondary-blue` | `#0ab86a` | Verde más oscuro para hover |
| Acento glow | `--accent-glow` | `rgba(16, 221, 136, 0.35)` | Sombras y brillos |
| Texto principal | `--text-primary` | `#ffffff` | Títulos, texto fuerte |
| Texto secundario | `--text-secondary` | `rgba(255, 255, 255, 0.75)` | Descripciones |
| Texto muted | `--text-muted` | `rgba(255, 255, 255, 0.5)` | Labels, hints |
| Borde sutil | `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Dividers, cards |
| Borde acento | `--border-accent` | `rgba(0, 255, 136, 0.3)` | Focus, highlights |

**Gradientes:**
- Hero / highlights: `linear-gradient(135deg, #10dd88 0%, #0ab86a 50%, #10dd88 100%)` con animación sutil.
- Fondos de sección: `linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 50%, #0a0a0a 100%)` + grid sutil en CSS (`.hero::before`).

### 1.2 Tipografía

- **Títulos (display):** Fuente bold/moderna (ej. Space Grotesk, Clash Display, Satoshi o similar). Tamaños grandes en hero (clamp 2.5rem–4rem).
- **Subtítulos / secciones:** Misma familia, peso 600–700.
- **Cuerpo:** Fuente legible (Inter, DM Sans, Plus Jakarta Sans). Line-height 1.5–1.6.
- **Stats y números:** Monospace o display para sensación “tech” (ej. JetBrains Mono para números).

### 1.3 Efectos “Web3 gaming ultra HD”

- **Glow:** Box-shadow con `--accent-glow` en botones primarios, highlights y iconos clave.
- **Glassmorphism:** `backdrop-filter: blur(12px)` + `--bg-glass` en navbar, cards flotantes, modales.
- **Bordes neón:** `1px solid` con color acento y opcional `box-shadow` del mismo color para “borde que brilla”.
- **Grid / ruido de fondo:** Fondo sutil con grid de puntos o líneas muy tenues (#1a1a1a, opacidad baja) para dar profundidad sin distraer.
- **Micro-animaciones:** Hover en botones (scale 1.02, glow más fuerte), transiciones 0.2–0.3s ease.
- **Particles / motivos:** En hero, formas geométricas o partículas muy sutiles en verde (#00ff88) a baja opacidad para ambiente “tech” sin saturar.

### 1.4 Componentes base

- **Botón primario:** Fondo verde eléctrico, texto negro, border-radius 8–12px, padding generoso, sombra con glow verde.
- **Botón secundario:** Outline verde eléctrico, fondo transparente, hover con relleno sutil.
- **Cards:** Fondo `--bg-surface`, borde `--border-subtle`, hover con borde acento y ligero glow.
- **Inputs:** Fondo oscuro, borde sutil, focus con borde y sombra acento.

---

## 2. Fase 1 – Rediseño del landing `/` (prioridad)

La ruta `/` se sirve con `Hero.tsx` + `Footer.tsx`. El CSS principal está en `Hero.css` y en variables de `themes.css`.

### 2.1 Orden de implementación recomendado

1. **Variables globales y tema**
   - Archivo: `src/css/themes.css` (y si existe `index.css` para variables base).
   - Añadir/duplicar variables para el “tema ArcusX v2”: negro + verde eléctrico (las de la tabla anterior).
   - Opción: mantener tema “dark” actual como legacy y añadir `data-theme="arcusx-v2"` o sobrescribir directamente el dark con la nueva paleta.
   - Asegurar que `--gradient-primary`, `--gradient-secondary`, `--primary-blue` (o renombrar a `--accent-primary`) usen verde eléctrico donde corresponda en la landing.

2. **Hero section (above the fold)**
   - **Fondo:** Negro (#0a0a0a) con gradiente sutil o grid/ruido. Quitar o suavizar gradiente azul actual.
   - **Título:** Tipografía más impactante; reemplazar highlights azules por verde eléctrico (clase tipo `.hero-title-highlight` con nuevo color y glow).
   - **Descripción:** Mantener jerarquía; color `--text-secondary`.
   - **Stats (10+, 50+, $1K+):** Números con ligero glow verde o color acento; contenedor con borde sutil o glass.
   - **Botones:** Primario = verde eléctrico + glow; secundario = outline verde. Ajustar `Hero.css` (`.hero-button.primary`, `.hero-button.secondary`).
   - **Floating particles (job cards):** Rediseñar cards con estilo glass (fondo semi-transparente, blur), borde verde muy sutil, sombra suave. Evitar aspecto “flat” antiguo; que se sientan integradas al nuevo look.

3. **Sección Problema (`#problematica`)**
   - Fondo: negro o `--bg-surface`. Títulos con acento verde en la parte highlight.
   - **Stat boxes:** Mismo lenguaje que las cards del hero: fondo surface, borde sutil, hover con acento.
   - **Imagen:** Mantener; overlay si hace falta para contraste con texto. Opcional: borde o frame con glow sutil.

4. **Sección Solución (`#solucion`)**
   - Mismo criterio que Problema: consistencia de fondos, bordes y acentos verdes.
   - Botón CTA con estilo primario nuevo (verde + glow).

5. **Sección Características (`#caracteristicas`)**
   - **Feature cards:** Fondo `--bg-surface`, borde `--border-subtle`, iconos con color acento y opcional glow.
   - Título de sección con tipografía y color coherentes con el hero.

6. **~~Sección Equipo~~** — Eliminada (no se considera profesional en la landing).

7. **Sección FAQ (`#faq`)**
   - Cards con mismo sistema (surface + borde, hover acento). Pregunta en blanco, respuesta en `--text-secondary`.

8. **CTA final**
   - Fondo más oscuro o con gradiente sutil; botón grande verde eléctrico con glow. Texto claro y directo.

9. **Footer**
   - Componente: `Footer.tsx` + estilos (en `Hero.css` o `Footer.css` si existe).
   - Fondo negro/surface, enlaces y textos con `--text-secondary`, hover verde. Logo y redes alineados al nuevo branding.

### 2.2 Archivos a tocar en Fase 1

| Archivo | Cambios |
|---------|---------|
| `src/css/themes.css` | Nuevas variables negro + verde; aplicar al tema dark (o nuevo tema) |
| `src/css/Hero.css` | Todas las secciones: colores, fondos, bordes, sombras, tipografía (si no se usa design tokens en otro sitio) |
| `src/components/Hero.tsx` | Solo si hace falta añadir clases nuevas (ej. `hero-v2`, `section-dark`) o ajustar estructura para glass/cards |
| `src/components/Footer.tsx` | Clases para nuevo estilo; posible nuevo `Footer.css` si no existe |
| `src/index.css` o `App.css` | Variables globales base si se definen ahí |

### 2.3 Navbar en `/`

- La navbar suele ser compartida; en Fase 1 conviene al menos: fondo negro/glass, logo actualizado si aplica, enlaces con hover verde y botón “Entrar”/“Registrarse” con estilo primario/secundario nuevo para coherencia con el hero.

---

## 3. Fases siguientes (después del landing)

- **Fase 2 – Auth y shell:** Login, Register, Preloader; mismo sistema de color y botones/inputs.
- **Fase 3 – Dashboard:** Sidebar, headers, cards de tareas/freelancers; aplicar surface, bordes y acentos verdes.
- **Fase 4 – Resto de páginas:** Swap, Tutoriales, Soporte, Admin (listas y formularios) con la misma paleta y componentes.
- **Fase 5 – Branding y assets:** Logo en verde eléctrico/negro, favicon, og:image, posible ilustración o gráficos para hero.

---

## 4. Checklist Fase 1 – Landing `/`

- [x] Variables de diseño (negro + verde eléctrico menos brillante) en `themes.css` + tokens `--bg-surface`, `--bg-glass`, `--border-subtle`, `--border-accent`
- [x] Tipografía: Space Grotesk (títulos), Plus Jakarta Sans (cuerpo) vía Google Fonts
- [x] Hero: fondo con grid sutil (`.hero::before`), título con clamp + Space Grotesk, highlights con glow, stats con glass, botones con variables
- [x] Hero: floating job cards con estilo glass + borde acento + hover glow
- [x] Sección Características: feature cards con `--bg-surface`, hover acento, iconos con color acento
- [ ] Navbar: fondo y botones coherentes con nuevo diseño (ya usa variables)
- [ ] Sección Problema: fondos, stat boxes, CTA con tokens
- [ ] Sección Solución: mismo criterio
- [ ] Sección FAQ: cards con surface + borde
- [ ] CTA final: botón y fondo (ya con variables)
- [ ] Footer: colores y hover (ya con variables)
- [x] Modo claro vigente; verde solo en dark, azul en light

---

## 5. Referencias de estilo (para inspiración)

- Plataformas Web3/gaming con negro + verde: dashboards de gaming, landing de proyectos DeFi/gaming en Ethereum/Solana.
- Efectos: glassmorphism, bordes neón, sombras de color, tipografía bold en títulos.
- Mantener legibilidad y contraste (WCAG) sobre todo en textos largos.

Cuando quieras, el siguiente paso puede ser implementar solo las variables en `themes.css` y el hero (fondo + título + stats + botones) para tener un primer bloque visible del nuevo diseño en `/`.
