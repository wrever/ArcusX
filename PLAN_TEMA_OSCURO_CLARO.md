# Plan de Implementación: Modo Oscuro/Claro para ArcusX

## 🎯 Objetivo
Implementar un sistema completo de temas (oscuro/claro) para toda la plataforma, manteniendo la paleta actual como modo oscuro y creando una paleta clara complementaria.

---

## 📋 Fases de Implementación

### FASE 1: Infraestructura Base
1. **Context/Provider de Tema**
   - Crear `ThemeContext` y `ThemeProvider`
   - Estado global para tema actual (dark/light)
   - Función para toggle
   - Persistencia en localStorage

2. **Variables CSS para Temas**
   - Definir variables CSS para modo oscuro (actual)
   - Definir variables CSS para modo claro (nuevo)
   - Sistema de transición suave entre temas

### FASE 2: Paleta de Colores

#### Modo Oscuro (Actual - Mantener)
- Background principal: `#07233c`
- Background secundario: `#0a2d4a`
- Texto principal: `#ffffff`
- Texto secundario: `rgba(255, 255, 255, 0.7)`
- Primary blue: `#28c0f0`
- Secondary blue: `#1180b3`
- Borders: `rgba(255, 255, 255, 0.1)`

#### Modo Claro (Nuevo)
- Background principal: `#ffffff`
- Background secundario: `#f8f9fa`
- Texto principal: `#1a1a1a`
- Texto secundario: `#6c757d`
- Primary blue: `#1180b3` (más oscuro para contraste)
- Secondary blue: `#0d6efd`
- Borders: `rgba(0, 0, 0, 0.1)`
- Cards: `#ffffff` con sombra suave

### FASE 3: Componente Toggle
1. **Botón Toggle en Hero**
   - Icono de sol/luna
   - Animación suave
   - Posicionamiento (top-right o navbar)
   - Responsive

2. **Estilos del Toggle**
   - Diseño moderno y accesible
   - Estados hover/active
   - Indicador visual del tema actual

### FASE 4: Aplicación a Componentes
1. **Componentes Principales**
   - Hero
   - Navbar
   - Dashboard
   - Login/Register
   - Cards
   - Buttons
   - Forms
   - Modals

2. **CSS Variables**
   - Reemplazar colores hardcodeados por variables
   - Usar `var(--bg-primary)`, `var(--text-primary)`, etc.

### FASE 5: Optimizaciones
1. **Transiciones**
   - Transición suave entre temas (0.3s)
   - Sin parpadeos (flash of wrong theme)

2. **Persistencia**
   - Guardar preferencia en localStorage
   - Cargar tema al iniciar
   - Detectar preferencia del sistema (opcional)

---

## 🎨 Estructura de Variables CSS

```css
:root[data-theme="dark"] {
  --bg-primary: #07233c;
  --bg-secondary: #0a2d4a;
  --bg-tertiary: rgba(255, 255, 255, 0.03);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);
  --primary-blue: #28c0f0;
  --secondary-blue: #1180b3;
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow: rgba(0, 0, 0, 0.3);
}

:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  --text-primary: #1a1a1a;
  --text-secondary: #6c757d;
  --text-muted: #adb5bd;
  --primary-blue: #1180b3;
  --secondary-blue: #0d6efd;
  --border-color: rgba(0, 0, 0, 0.1);
  --shadow: rgba(0, 0, 0, 0.1);
}
```

---

## 📁 Archivos a Crear/Modificar

### Nuevos Archivos:
1. `arcusx/src/contexts/ThemeContext.tsx` - Context y Provider
2. `arcusx/src/components/ThemeToggle.tsx` - Botón toggle
3. `arcusx/src/css/themes.css` - Variables CSS de temas

### Archivos a Modificar:
1. `arcusx/src/main.tsx` - Envolver con ThemeProvider
2. `arcusx/src/components/Hero.tsx` - Agregar ThemeToggle
3. `arcusx/src/components/Navbar.tsx` - Agregar ThemeToggle (opcional)
4. Todos los archivos CSS - Usar variables CSS

---

## ✅ Checklist de Implementación

- [ ] Crear ThemeContext y ThemeProvider
- [ ] Crear variables CSS para ambos temas
- [ ] Crear componente ThemeToggle
- [ ] Integrar ThemeProvider en main.tsx
- [ ] Agregar toggle en Hero
- [ ] Aplicar variables CSS a componentes principales
- [ ] Probar transiciones
- [ ] Verificar persistencia en localStorage
- [ ] Testing responsive
- [ ] Testing en todos los componentes

---

## 🚀 Prioridades

1. **URGENTE:** Infraestructura base (Context, Provider, Variables CSS)
2. **URGENTE:** Componente Toggle funcional
3. **IMPORTANTE:** Aplicar a Hero y Navbar
4. **IMPORTANTE:** Aplicar a Dashboard
5. **MEDIO:** Aplicar a resto de componentes
6. **MEDIO:** Optimizaciones y pulido

---

**Última actualización:** Enero 2026

