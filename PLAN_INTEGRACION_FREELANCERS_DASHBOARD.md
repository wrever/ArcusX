# 📋 PLAN COMPLETO - INTEGRACIÓN SECCIÓN FREELANCERS EN DASHBOARD

**Fecha:** 06 de Enero, 2026  
**Objetivo:** Integrar una nueva sección de freelancers en el dashboard de usuarios que permita explorar, buscar y ver perfiles públicos de trabajadores.

---

## 🎯 OBJETIVO GENERAL

Agregar una nueva pestaña/tab en el dashboard llamada "Freelancers" que muestre una lista de todos los trabajadores registrados en la plataforma con sus perfiles públicos, permitiendo búsqueda, filtrado y navegación a perfiles individuales.

---

## 📐 ARQUITECTURA Y COMPONENTES

### Estructura Actual del Dashboard

El dashboard actual tiene las siguientes secciones:
- **Tasks** (`activeTab === 'tasks'`) - Lista de tareas disponibles
- **In Progress** (`activeTab === 'in-progress'`) - Tareas en progreso del usuario
- **Manage Tasks** (`activeTab === 'manage-tasks'`) - Tareas creadas por el usuario
- **Wallet** (`activeTab === 'wallet'`) - Transacciones y ganancias
- **Notifications** (`activeTab === 'notifications'`) - Notificaciones del usuario
- **Settings** (`activeTab === 'settings'`) - Configuración del usuario

### Nueva Estructura

Agregar:
- **Freelancers** (`activeTab === 'freelancers'`) - Lista de freelancers con perfiles públicos

---

## 🔧 COMPONENTES A CREAR/MODIFICAR

### 1. Backend (PHP) - Nueva API Endpoint

**Archivo:** `backend_externo/get_freelancers.php`

**Funcionalidad:**
- Obtener lista de usuarios que son freelancers (no admin)
- Filtrar por: búsqueda por nombre, habilidades, rating mínimo, tareas completadas
- Paginación
- Ordenar por: rating, tareas completadas, fecha de registro
- Retornar datos públicos necesarios para mostrar en la lista

**Datos a retornar:**
```php
{
  "success": true,
  "freelancers": [
    {
      "id": 1,
      "username": "freelancer1",
      "avatar_url": "url",
      "average_rating": 4.5,
      "total_ratings": 10,
      "tasks_completed": 15,
      "total_earned": 1500.00,
      "skills": ["React", "TypeScript"],
      "public_profile": true,
      "joined_date": "2025-01-01"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
```

### 2. Frontend - Servicio

**Archivo:** `arcusx/src/services/freelancerService.ts`

**Funcionalidad:**
- Función para obtener lista de freelancers
- Parámetros: búsqueda, filtros, paginación, ordenamiento
- Tipo de datos TypeScript para freelancers

### 3. Frontend - Tipos TypeScript

**Archivo:** `arcusx/src/types/freelancer.ts` (nuevo)

**Interfaces:**
```typescript
export interface Freelancer {
  id: number;
  username: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
  tasks_completed: number;
  total_earned: number;
  skills?: string[];
  public_profile: boolean;
  joined_date: string;
}

export interface FreelancersResponse {
  success: boolean;
  freelancers: Freelancer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface FreelancerFilters {
  search?: string;
  minRating?: number;
  minTasksCompleted?: number;
  skills?: string[];
  sortBy?: 'rating' | 'tasks_completed' | 'joined_date' | 'total_earned';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

### 4. Frontend - Componente de Card

**Archivo:** `arcusx/src/components/FreelancerCard.tsx` (nuevo)

**Funcionalidad:**
- Mostrar información resumida de un freelancer
- Avatar, nombre, rating, tareas completadas
- Botón para ver perfil completo
- Diseño atractivo y responsive

### 5. Frontend - Componente de Lista

**Archivo:** `arcusx/src/components/FreelancersList.tsx` (nuevo)

**Funcionalidad:**
- Lista de cards de freelancers
- Manejo de paginación
- Estados de carga y error
- Grid/lista responsive

### 6. Frontend - Modificar Dashboard

**Archivo:** `arcusx/src/dashboard.tsx`

**Modificaciones:**
- Agregar nuevo tab "Freelancers" en el sidebar
- Agregar estado y lógica para la nueva sección
- Integrar componente FreelancersList
- Agregar filtros y búsqueda

### 7. Frontend - Estilos CSS

**Archivo:** `arcusx/src/css/FreelancerCard.css` (nuevo)  
**Archivo:** `arcusx/src/css/FreelancersList.css` (nuevo)  
**Archivo:** `arcusx/src/css/dashboard.css` (modificar)

**Funcionalidad:**
- Estilos para cards de freelancers
- Estilos para la lista y filtros
- Responsive design

### 8. Frontend - i18n (Traducciones)

**Archivo:** `arcusx/src/i18n/es.json` y `arcusx/src/i18n/en.json` (modificar)

**Agregar traducciones para:**
- Título de la sección "Freelancers"
- Placeholders de búsqueda
- Labels de filtros
- Mensajes de carga/error
- Textos de botones

---

## 📝 FLUJO DE USUARIO

1. Usuario navega al dashboard
2. Usuario hace clic en el tab "Freelancers" en el sidebar
3. Se carga la lista de freelancers (página 1, 20 por página)
4. Usuario puede:
   - Ver lista de freelancers en grid/cards
   - Buscar por nombre
   - Filtrar por rating, tareas completadas, habilidades
   - Ordenar por diferentes criterios
   - Navegar entre páginas
   - Hacer clic en un freelancer para ver su perfil público completo
5. Al hacer clic en un card, navega a `/profile/:userId` (ya existe)

---

## 🔄 INTEGRACIÓN CON COMPONENTES EXISTENTES

### Reutilizar Componentes Existentes

1. **UserProfile.tsx** - Ya existe, mostrará el perfil completo al hacer clic
2. **RatingDisplay.tsx** - Ya existe, se usará en las cards
3. **Dashboard Footer** - Ya existe, se mantendrá
4. **WalletButton** - Ya existe, se mantendrá

### APIs Existentes que se pueden Reutilizar

1. **get_user_profile.php** - Ya existe, se usará para perfil completo
2. **get_user_public_stats.php** - Ya existe, se puede usar para estadísticas en cards

---

## 🎨 DISEÑO Y UX

### Card de Freelancer

```
┌─────────────────────────────────┐
│  [Avatar]  Nombre Usuario       │
│            ⭐ 4.5 (10 ratings)   │
│                                  │
│  ✅ 15 tareas completadas        │
│  💰 $1,500.00 ganados            │
│  🏷️ React, TypeScript, Node.js  │
│                                  │
│  [Ver Perfil Completo]          │
└─────────────────────────────────┘
```

### Layout de la Sección

- **Header:** Título "Freelancers", barra de búsqueda
- **Filtros:** Rating mínimo, Tareas mínimas, Habilidades, Ordenar por
- **Grid de Cards:** Responsive (3-4 columnas desktop, 2 mobile, 1 mobile pequeño)
- **Paginación:** Bottom navigation con números de página

---

## 🔐 PERMISOS Y SEGURIDAD

- Solo mostrar freelancers con `public_profile = true`
- No mostrar datos sensibles (email, wallet address a menos que sea público)
- API endpoint debe ser accesible sin autenticación (o con token opcional)
- Validar y sanitizar todos los parámetros de búsqueda/filtrado

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Nueva pestaña "Freelancers" visible en el dashboard
2. ✅ Lista de freelancers se carga correctamente
3. ✅ Búsqueda funciona correctamente
4. ✅ Filtros funcionan correctamente
5. ✅ Paginación funciona correctamente
6. ✅ Cards muestran información relevante
7. ✅ Navegación a perfil completo funciona
8. ✅ Diseño responsive funciona en móvil/tablet/desktop
9. ✅ Estados de carga y error se manejan correctamente
10. ✅ Traducciones funcionan correctamente (español/inglés)

---

## 📅 ESTIMACIÓN DE TIEMPO

- Backend API: 2-3 horas
- Frontend Service + Types: 1 hora
- Componente FreelancerCard: 2 horas
- Componente FreelancersList: 3 horas
- Integración en Dashboard: 2 horas
- Estilos CSS: 2 horas
- i18n: 1 hora
- Testing y ajustes: 2 horas

**Total estimado:** 15-17 horas

---

## 🚀 PRÓXIMOS PASOS

1. Revisar y aprobar este plan
2. Crear TODO list detallado con tareas pequeñas
3. Comenzar implementación siguiendo el TODO list
4. Testing y ajustes finales
5. Deploy y documentación

---

