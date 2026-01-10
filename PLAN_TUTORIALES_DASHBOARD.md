# 📚 PLAN DE IMPLEMENTACIÓN - SECCIÓN DE TUTORIALES EN DASHBOARD

## 🎯 OBJETIVO

Crear una sección de tutoriales dentro del dashboard de usuarios donde puedan aprender el funcionamiento de la plataforma ArcusX. La sección será simple, con tarjetas que muestren thumbnail, título, descripción y un botón que abra el video de YouTube en una nueva pestaña.

**Enfoque:** Comenzar con tutoriales introductorios básicos sobre Stellar, wallets y la plataforma ArcusX, seguidos de tutoriales específicos sobre funcionalidades clave. Estructura simple sin categorías ni filtros complejos.

---

## 📋 ESTRUCTURA GENERAL

### 1. **Nuevo Tab en Sidebar**
- Agregar pestaña "Tutoriales" en el menú lateral del dashboard
- Icono: `FaGraduationCap` o `FaBook` (React Icons)
- Posición: Después de "Freelancers" y antes de "Wallet"

### 2. **Componente Principal: TutorialsTab**
- Componente React que renderiza la lista de tutoriales
- Ubicación: `arcusx/src/components/TutorialsTab.tsx`
- Diseño tipo grid con tarjetas responsivas

### 3. **Estructura de Datos de Tutoriales**
- Array de objetos con información de cada tutorial
- Propiedades:
  - `id`: Identificador único
  - `title`: Título del tutorial (ES/EN)
  - `description`: Descripción del contenido (ES/EN)
  - `thumbnail`: URL o ruta de imagen del thumbnail
  - `youtubeUrl`: URL completa de YouTube
  - `category`: Categoría del tutorial (opcional)
  - `duration`: Duración del video (opcional)

### 4. **Estilos CSS**
- Archivo: `arcusx/src/css/TutorialsTab.css`
- Diseño adaptado para modo oscuro y claro
- Grid responsivo
- Tarjetas con hover effects

---

## 🎨 DISEÑO DE TARJETAS

### Estructura de Cada Tarjeta:
```
┌─────────────────────────────┐
│   [THUMBNAIL DEL VIDEO]     │
│   (Aspect ratio 16:9)       │
├─────────────────────────────┤
│   TÍTULO DEL TUTORIAL       │
│   (Fuente bold, tamaño 1.2rem)│
├─────────────────────────────┤
│   Descripción breve del     │
│   contenido que se enseñará │
│   (Texto secundario, 2-3 líneas max)│
├─────────────────────────────┤
│   [Botón: Ver Tutorial]     │
│   (Icono + texto)           │
└─────────────────────────────┘
```

### Especificaciones de Diseño:

#### Modo Oscuro:
- **Background de tarjeta**: `rgba(255, 255, 255, 0.05)` con `backdrop-filter: blur(10px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`
- **Título**: Color blanco (`#ffffff`)
- **Descripción**: Color gris claro (`rgba(255, 255, 255, 0.7)`)
- **Hover**: Elevación con sombra y ligero cambio de opacidad
- **Botón**: Background azul (`var(--primary-blue)`) con texto blanco

#### Modo Claro:
- **Background de tarjeta**: `#ffffff` con sombra suave
- **Border**: `1px solid rgba(100, 116, 139, 0.2)`
- **Título**: Color oscuro (`#0f172a`)
- **Descripción**: Color gris oscuro (`#475569`)
- **Hover**: Sombra más pronunciada
- **Botón**: Background azul (`var(--primary-blue)`) con texto blanco

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Archivos Nuevos:
1. `arcusx/src/components/TutorialsTab.tsx`
2. `arcusx/src/css/TutorialsTab.css`

### Archivos a Modificar:
1. `arcusx/src/dashboard.tsx`
   - Agregar import de `TutorialsTab`
   - Agregar import de icono (FaGraduationCap o FaBook)
   - Agregar item en sidebar navigation
   - Agregar caso en `activeTab` para renderizar `TutorialsTab`
   - Agregar título en dashboard-header

2. `arcusx/src/i18n/es.json` (o archivo de traducciones)
   - Agregar traducciones para:
     - `dashboard.tabs.tutorials`: "Tutoriales"
     - `dashboard.title.tutorials`: "Tutoriales y Guías"
     - `tutorials.title`: "Aprende a usar ArcusX"
     - `tutorials.subtitle`: "Guías paso a paso para aprovechar al máximo la plataforma"
     - `tutorials.watch`: "Ver Tutorial"
     - `tutorials.duration`: "Duración"

3. `arcusx/src/i18n/en.json` (si existe)
   - Agregar traducciones equivalentes en inglés

---

## 🎬 ESTRUCTURA DE DATOS DE TUTORIALES

### Estructura Simple sin Categorías:

```typescript
interface Tutorial {
  id: number;
  title: {
    es: string;
    en: string;
  };
  description: {
    es: string;
    en: string;
  };
  thumbnail: string; // URL de imagen o ruta local
  youtubeUrl: string; // URL completa de YouTube
  duration?: string; // '5:30', '10:15', etc.
}
```

### Orden de Tutoriales (Orden Lógico de Aprendizaje):

Los tutoriales están ordenados en el array siguiendo un orden lógico para que los usuarios nuevos puedan aprender paso a paso:

1. **Introducción a Stellar y Wallets** - Base fundamental (Stellar, blockchain, wallets)
2. **Introducción a ArcusX** - Qué es ArcusX y cómo funciona
3. **Conectar Wallet Freighter** - Paso práctico necesario
4. **Crear Tarea** - Para clientes
5. **Aplicar a Tarea** - Para freelancers
6. **Sistema de Escrow** - Funcionamiento de pagos
7. **Supervisar Tareas** - Gestión durante el trabajo
8. **Disputas** - Resolución de conflictos

### Ejemplo de Array de Tutoriales:

const tutorials: Tutorial[] = [
  {
    id: 1,
    title: {
      es: 'Introducción a Stellar y Wallets',
      en: 'Introduction to Stellar and Wallets'
    },
    description: {
      es: 'Conoce qué es Stellar, cómo funciona la blockchain y qué wallets puedes usar. Aprende sobre Freighter y otras opciones para gestionar tus activos digitales.',
      en: 'Learn what Stellar is, how the blockchain works and what wallets you can use. Learn about Freighter and other options to manage your digital assets.'
    },
    thumbnail: '/images/tutorials/stellar-intro.jpg', // o URL de thumbnail de YouTube
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '8:00'
  },
  {
    id: 2,
    title: {
      es: 'Introducción a ArcusX',
      en: 'Introduction to ArcusX'
    },
    description: {
      es: 'Aprende qué es ArcusX, cómo funciona la plataforma, qué puedes hacer como cliente o freelancer, y los conceptos básicos para empezar a usarla.',
      en: 'Learn what ArcusX is, how the platform works, what you can do as a client or freelancer, and the basic concepts to get started.'
    },
    thumbnail: '/images/tutorials/arcusx-intro.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '6:30'
  },
  {
    id: 3,
    title: {
      es: 'Cómo Conectar tu Wallet Freighter',
      en: 'How to Connect your Freighter Wallet'
    },
    description: {
      es: 'Tutorial paso a paso para instalar Freighter, crear tu wallet y conectar tu cuenta a la plataforma ArcusX.',
      en: 'Step-by-step tutorial to install Freighter, create your wallet and connect your account to the ArcusX platform.'
    },
    thumbnail: '/images/tutorials/connect-wallet.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '5:00'
  },
  {
    id: 4,
    title: {
      es: 'Cómo Crear tu Primera Tarea',
      en: 'How to Create your First Task'
    },
    description: {
      es: 'Guía completa para publicar tu primera tarea en ArcusX: establecer presupuesto, descripción, categorías y todo lo necesario para encontrar al freelancer perfecto.',
      en: 'Complete guide to publish your first task on ArcusX: set budget, description, categories and everything needed to find the perfect freelancer.'
    },
    thumbnail: '/images/tutorials/create-task.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '7:00'
  },
  {
    id: 5,
    title: {
      es: 'Cómo Aplicar a una Tarea',
      en: 'How to Apply to a Task'
    },
    description: {
      es: 'Aprende cómo aplicar a tareas como freelancer: crear una propuesta atractiva, mostrar tu portafolio y aumentar tus posibilidades de ser seleccionado.',
      en: 'Learn how to apply to tasks as a freelancer: create an attractive proposal, show your portfolio and increase your chances of being selected.'
    },
    thumbnail: '/images/tutorials/apply-task.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '6:00'
  },
  {
    id: 6,
    title: {
      es: 'Sistema de Escrow y Pagos',
      en: 'Escrow System and Payments'
    },
    description: {
      es: 'Explicación detallada del funcionamiento del escrow en ArcusX: cómo fondear una tarea, aprobar trabajo y liberar pagos de forma segura.',
      en: 'Detailed explanation of how escrow works on ArcusX: how to fund a task, approve work and release payments securely.'
    },
    thumbnail: '/images/tutorials/escrow-payments.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '10:00'
  },
  {
    id: 7,
    title: {
      es: 'Supervisar y Completar Tareas',
      en: 'Supervise and Complete Tasks'
    },
    description: {
      es: 'Aprende cómo comunicarte con el freelancer durante el trabajo, revisar entregables y completar una tarea exitosamente.',
      en: 'Learn how to communicate with the freelancer during work, review deliverables and successfully complete a task.'
    },
    thumbnail: '/images/tutorials/supervise-task.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '8:30'
  },
  {
    id: 8,
    title: {
      es: 'Gestión de Disputas',
      en: 'Dispute Management'
    },
    description: {
      es: 'Cómo crear una disputa cuando surge un problema, proporcionar evidencia y entender el proceso de resolución de conflictos.',
      en: 'How to create a dispute when a problem arises, provide evidence and understand the conflict resolution process.'
    },
    thumbnail: '/images/tutorials/disputes.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    duration: '9:00'
  }
];
```

---

## 💻 IMPLEMENTACIÓN DEL COMPONENTE

### Estructura del Componente TutorialsTab:

```typescript
import React from 'react';
import { FaPlay, FaYoutube } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/TutorialsTab.css';

const TutorialsTab = () => {
  const { t, lang } = useI18n();
  
  // Array de tutoriales (estructura definida arriba)
  const tutorials = [...];
  
  const handleWatchTutorial = (youtubeUrl: string) => {
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <div className="tutorials-container">
      <div className="tutorials-header">
        <h2>{t('tutorials.title')}</h2>
        <p className="tutorials-subtitle">{t('tutorials.subtitle')}</p>
      </div>
      
      <div className="tutorials-grid">
        {tutorials.map((tutorial) => (
          <div key={tutorial.id} className="tutorial-card">
            <div className="tutorial-thumbnail">
              <img 
                src={tutorial.thumbnail} 
                alt={tutorial.title[lang]} 
                loading="lazy"
              />
              <div className="tutorial-play-overlay">
                <FaYoutube className="play-icon" />
              </div>
            </div>
            
            <div className="tutorial-content">
              <h3 className="tutorial-title">{tutorial.title[lang]}</h3>
              <p className="tutorial-description">
                {tutorial.description[lang]}
              </p>
              
              {tutorial.duration && (
                <div className="tutorial-meta">
                  <span className="tutorial-duration">
                    ⏱️ {tutorial.duration}
                  </span>
                </div>
              )}
              
              <button
                className="tutorial-watch-btn"
                onClick={() => handleWatchTutorial(tutorial.youtubeUrl)}
              >
                <FaPlay />
                <span>{t('tutorials.watch')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorialsTab;
```

---

## 🎨 ESTILOS CSS (TutorialsTab.css)

### Estructura Base:

```css
/* Contenedor Principal */
.tutorials-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.tutorials-header {
  margin-bottom: 2rem;
  text-align: center;
}

.tutorials-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.tutorials-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Grid de Tutoriales */
.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  padding: 1rem 0;
}

/* Tarjeta de Tutorial */
.tutorial-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.tutorial-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Thumbnail */
.tutorial-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  overflow: hidden;
  background: var(--bg-tertiary);
}

.tutorial-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.tutorial-card:hover .tutorial-thumbnail img {
  transform: scale(1.05);
}

.tutorial-play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.8);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tutorial-card:hover .tutorial-play-overlay {
  opacity: 1;
}

.play-icon {
  font-size: 24px;
  color: white;
}

/* Contenido de la Tarjeta */
.tutorial-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tutorial-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  line-height: 1.4;
}

.tutorial-description {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tutorial-meta {
  margin-bottom: 1rem;
}

.tutorial-duration {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* Botón Ver Tutorial */
.tutorial-watch-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  margin-top: auto;
}

.tutorial-watch-btn:hover {
  background: var(--primary-blue-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 192, 240, 0.4);
}

.tutorial-watch-btn:active {
  transform: translateY(0);
}
```

### Estilos para Modo Claro:

```css
:root[data-theme="light"] .tutorials-container {
  background: #f8fafc;
}

:root[data-theme="light"] .tutorial-card {
  background: #ffffff !important;
  border-color: rgba(100, 116, 139, 0.2) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:root[data-theme="light"] .tutorial-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

:root[data-theme="light"] .tutorials-header h2 {
  color: #0f172a !important;
}

:root[data-theme="light"] .tutorials-subtitle {
  color: #475569 !important;
}

:root[data-theme="light"] .tutorial-title {
  color: #0f172a !important;
}

:root[data-theme="light"] .tutorial-description {
  color: #475569 !important;
}

:root[data-theme="light"] .tutorial-duration {
  color: #64748b !important;
}

:root[data-theme="light"] .tutorial-thumbnail {
  background: #e2e8f0 !important;
}
```

### Estilos para Modo Oscuro:

```css
:root[data-theme="dark"] .tutorials-container {
  background: var(--bg-primary);
}

:root[data-theme="dark"] .tutorial-card {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(10px);
  border-color: rgba(255, 255, 255, 0.1) !important;
}

:root[data-theme="dark"] .tutorial-card:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}
```

### Media Queries (Responsive):

```css
/* Tablet */
@media (max-width: 968px) {
  .tutorials-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .tutorials-container {
    padding: 1.5rem;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .tutorials-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .tutorials-container {
    padding: 1rem;
  }
  
  .tutorials-header h2 {
    font-size: 1.5rem;
  }
  
  .tutorials-subtitle {
    font-size: 1rem;
  }
}
```

---

## 🔗 INTEGRACIÓN EN DASHBOARD

### Modificaciones en dashboard.tsx:

1. **Imports:**
```typescript
import TutorialsTab from './components/TutorialsTab';
import { FaGraduationCap } from 'react-icons/fa';
```

2. **Agregar item en sidebar:**
```typescript
<li className={activeTab === 'tutorials' ? 'active' : ''} onClick={() => setActiveTab('tutorials')}>
  <FaGraduationCap /> <span>{t('dashboard.tabs.tutorials')}</span>
</li>
```

3. **Agregar título en header:**
```typescript
{activeTab === 'tutorials' && t('dashboard.title.tutorials')}
```

4. **Renderizar componente:**
```typescript
{activeTab === 'tutorials' && (
  <TutorialsTab />
)}
```

---

## 🌐 TRADUCCIONES

### español (es.json):
```json
{
  "dashboard": {
    "tabs": {
      "tutorials": "Tutoriales"
    },
    "title": {
      "tutorials": "Tutoriales y Guías"
    }
  },
  "tutorials": {
    "title": "Aprende a usar ArcusX",
    "subtitle": "Guías paso a paso para aprovechar al máximo la plataforma",
    "watch": "Ver Tutorial",
    "duration": "Duración"
  }
}
```

### inglés (en.json):
```json
{
  "dashboard": {
    "tabs": {
      "tutorials": "Tutorials"
    },
    "title": {
      "tutorials": "Tutorials and Guides"
    }
  },
  "tutorials": {
    "title": "Learn how to use ArcusX",
    "subtitle": "Step-by-step guides to get the most out of the platform",
    "watch": "Watch Tutorial",
    "duration": "Duration"
  }
}
```

---

## 📸 THUMBNAILS

### Opciones para Thumbnails:

1. **Usar Thumbnails de YouTube directamente:**
   - Formato: `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg`
   - O: `https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg`

2. **Imágenes locales:**
   - Guardar en `arcusx/src/images/tutorials/`
   - Nombres: `stellar-intro.jpg`, `arcusx-intro.jpg`, `connect-wallet.jpg`, `create-task.jpg`, `apply-task.jpg`, `escrow-payments.jpg`, `supervise-task.jpg`, `disputes.jpg`
   - Dimensiones recomendadas: 1280x720px (16:9)

3. **Placeholder mientras se crean videos:**
   - Usar imagen genérica o logo de ArcusX
   - Agregar texto overlay indicando "Próximamente"
   - O usar thumbnails de YouTube directamente (aunque el video aún no exista, YouTube genera un thumbnail)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear componente `TutorialsTab.tsx`
- [ ] Crear archivo CSS `TutorialsTab.css`
- [ ] Agregar estilos para modo oscuro
- [ ] Agregar estilos para modo claro
- [ ] Agregar responsive design (mobile/tablet)
- [ ] Integrar en `dashboard.tsx`
- [ ] Agregar icono en sidebar
- [ ] Agregar traducciones (ES/EN)
- [ ] Crear/obtener thumbnails de tutoriales
- [ ] Definir array de tutoriales con URLs de YouTube
- [ ] Probar funcionalidad de abrir en nueva pestaña
- [ ] Verificar que funciona correctamente en ambos modos
- [ ] Verificar responsive en diferentes dispositivos

---

## 🎯 CONSIDERACIONES ADICIONALES

1. **Placeholder para Videos Futuros:**
   - Si aún no hay videos, crear tarjetas con estado "Próximamente"
   - Usar imagen placeholder y deshabilitar botón
   - O usar thumbnails de YouTube directamente

2. **Orden de Tutoriales:**
   - Los tutoriales están ordenados en orden lógico de aprendizaje
   - Comenzar con introducción a Stellar y wallets
   - Seguir con introducción a ArcusX
   - Continuar con funcionalidades específicas

3. **Búsqueda (Opcional - Futuro):**
   - Si la cantidad de tutoriales crece significativamente, agregar barra de búsqueda
   - Filtrar por título o descripción

4. **Ordenamiento (Opcional - Futuro):**
   - Si es necesario, agregar opción para ordenar por duración

---

## 🚀 PRIORIDAD DE IMPLEMENTACIÓN

**ALTA:** Funcionalidad básica funcionando
- Componente renderizando
- Tarjetas con diseño básico
- Botón que abre YouTube
- Modo oscuro y claro funcionando

**MEDIA:** Mejoras de UX
- Hover effects mejorados
- Transiciones suaves
- Responsive completo

**BAJA:** Features adicionales (solo si es necesario en el futuro)
- Búsqueda si hay muchos tutoriales
- Ordenamiento por duración

---

**Fecha de creación:** 06 de Enero, 2026  
**Estado:** Pendiente de implementación
