# Plan de Migración: PHP/MySQL → Supabase (PostgreSQL + Edge Functions)

> **Objetivo**: Eliminar el backend PHP en cPanel y convertir ArcusX en una plataforma 100% basada en Supabase (PostgreSQL, Row Level Security, Edge Functions y Realtime). Separar los contextos de **marketplace público** y **portal empresas**, que convergen en una capa compartida de datos.

---

## 1. Estado Actual (Diagnóstico)

### Backend PHP (65 archivos planos en `backend_externo/`)
| Dominio | Endpoints clave |
|---------|----------------|
| Auth | `sync_supabase_user.php`, `admin_login.php` |
| Tareas | `create_task`, `get_tasks`, `get_task_details`, `cancel_task`, `complete_task`, `get_user_tasks`, `get_accepted_tasks` |
| Propuestas | `apply_task`, `select_proposal`, `get_task_proposals` |
| Escrow | `create_escrow`, `confirm_escrow_signature`, `save_escrow_secret`, `get_escrow_status`, `get_escrow_secret`, `submit_complete_transaction`, `save_pending_transaction`, `get_pending_transaction`, `mark_work_started` |
| Mensajes/Chat | `send_message`, `get_messages` |
| Disputas | `create_dispute`, `check_disputes`, `get_user_disputes`, `get_dispute_chat`, `get_dispute_files`, `get_dispute_timeline`, `admin_release_dispute_funds` |
| Archivos | `upload_avatar`, `manage_portfolio`, `get_dispute_files` |
| Usuarios | `get_user_profile`, `update_user_profile`, `update_user`, `get_user_details`, `get_user_public_stats`, `get_user_earnings_summary`, `get_user_rating_summary`, `register_wallet`, `verify_wallet` |
| Ratings | `create_rating`, `get_ratings` |
| Notificaciones | `get_notifications`, `mark_notification_read` |
| Stats | `get_stats`, `get_public_stats`, `task_stats`, `get_completed_tasks_count` |
| Límites | `check_user_limits`, `get_user_limits`, `set_cooldown`, `delete_scheduled_tasks` |
| Fees/TX | `get_platform_fee`, `get_user_transactions` |
| Admin | `admin.php`, `admin_common.php`, `admin_actions.php` |

### Problemas actuales
- PHP 8.1 en cPanel (hosting compartido) → sin WebSockets, sin escalabilidad
- 65 archivos sin router ni middleware compartido → CORS duplicado en cada archivo
- JWT custom (HS256) distinto al JWT de Supabase → doble sistema de autenticación
- MySQL en host compartido → sin RLS, sin tiempo real
- Sin tipos, sin tests, sin CI
- El chat usa polling HTTP (no WebSockets)
- Subida de avatares guarda en disco del servidor → no escala

### Frontend (relevante para la migración)
- `src/config/database.ts` → `API_URL = https://arcusx.pro/api`
- Todos los servicios (`authService`, `disputeService`, etc.) usan `axios.post(API_URL + '/...php')`
- Auth doble: Supabase OAuth → llama a `sync_supabase_user.php` → genera JWT propio
- Wallet se guarda en `localStorage` post-conexión

---

## 2. Arquitectura Target

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│  arcusx.pro (público)    empresas.arcusx.pro (enterprise)   │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE PROJECT                         │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Auth (JWT)  │  │ Edge Functions │  │   Realtime     │  │
│  │  Google/GH   │  │  (Deno/TS)     │  │  (chat, notif) │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          PostgreSQL + Row Level Security             │   │
│  │   schema: public (marketplace) + enterprise         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────┐   ┌──────────────────────────────┐ │
│  │   Storage Buckets  │   │   Supabase Vault (secrets)   │ │
│  │  avatars, archivos │   │  API keys, JWT secrets       │ │
│  └────────────────────┘   └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│           SERVICIOS EXTERNOS (sin cambios)                  │
│  Trustless Work API  │  Stellar Network  │  Soroswap        │
└─────────────────────────────────────────────────────────────┘
```

### Separación de contextos

| Contexto | Dominio | Schema PostgreSQL | Edge Functions prefix |
|----------|---------|-------------------|-----------------------|
| Marketplace público | `arcusx.pro` | `public` | `/marketplace/` |
| Portal empresas | `empresas.arcusx.pro` | `enterprise` | `/enterprise/` |
| Compartido | ambos | `shared` | `/shared/` |
| Admin | solo interno | `admin` | `/admin/` |

---

## 3. Plan de Migración por Fases

---

### FASE 0 — Preparación (1 semana)

**Objetivo**: montar el proyecto Supabase sin tocar producción.

#### 0.1 Crear proyecto Supabase
- Crear proyecto en [supabase.com](https://supabase.com) (región más cercana: US East u Oregon)
- Guardar: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Habilitar extensiones PostgreSQL necesarias:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pg_cron";      -- para jobs programados
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```

#### 0.2 Instalar Supabase CLI
```bash
npm install -g supabase
supabase init          # en la raíz del repo
supabase login
supabase link --project-ref <project-ref>
```

#### 0.3 Estructura de carpetas (monorepo)
```
ArcusX/
├── arcusx/              # Frontend React (sin cambios por ahora)
├── supabase/
│   ├── migrations/      # DDL versionado
│   ├── functions/       # Edge Functions (Deno/TypeScript)
│   │   ├── shared/      # middleware y utils compartidos
│   │   ├── marketplace/ # lógica del marketplace público
│   │   ├── enterprise/  # lógica portal empresas
│   │   └── admin/       # lógica admin
│   └── seed.sql         # datos iniciales
└── MIGRATION_SUPABASE.md
```

#### 0.4 Exportar esquema MySQL actual
```bash
mysqldump -u arcusxon_owner -p arcusxon_users --no-data > schema.sql
```
Revisar y documentar todas las tablas existentes antes de diseñar el esquema PostgreSQL.

---

### FASE 1 — Esquema PostgreSQL (1 semana)

**Objetivo**: diseñar y aplicar el esquema completo con RLS.

#### 1.1 Esquema `public` (marketplace)

```sql
-- Usuarios (espejo de auth.users de Supabase)
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  skills        TEXT[],
  wallet_address TEXT,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_ratings  INT DEFAULT 0,
  tasks_today    INT DEFAULT 0,
  tasks_this_week INT DEFAULT 0,
  cooldown_until  TIMESTAMPTZ,
  last_task_created TIMESTAMPTZ,
  human_verified  BOOLEAN DEFAULT FALSE,
  certix_tier     TEXT DEFAULT 'free',  -- 'free' | 'verified' | 'pro'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Tareas
CREATE TABLE public.tasks (
  id            BIGSERIAL PRIMARY KEY,
  creator_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT NOT NULL,
  price         NUMERIC(18,7) NOT NULL,  -- workerAmount en USDC
  currency      TEXT DEFAULT 'USDC',
  difficulty    TEXT CHECK (difficulty IN ('Fácil','Intermedio','Difícil')),
  category      TEXT CHECK (category IN ('Desarrollo','Diseño','Marketing','Blockchain','Contenido')),
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','assigned','completed','cancelled','disputed')),
  escrow_id     TEXT,
  accepted_applicant_id UUID REFERENCES public.users(id),
  client_accepted_completion BOOLEAN DEFAULT FALSE,
  worker_accepted_completion BOOLEAN DEFAULT FALSE,
  work_started_at TIMESTAMPTZ,
  files         JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Propuestas / aplicaciones
CREATE TABLE public.proposals (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  applicant_id  UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cover_letter  TEXT,
  proposed_price NUMERIC(18,7),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, applicant_id)
);

-- Mensajes de chat (por tarea)
CREATE TABLE public.messages (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Disputas
CREATE TABLE public.disputes (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  claimant_id   UUID REFERENCES public.users(id),
  reason        TEXT NOT NULL,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  resolution    TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Mensajes de disputa
CREATE TABLE public.dispute_messages (
  id            BIGSERIAL PRIMARY KEY,
  dispute_id    BIGINT REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES public.users(id),
  message       TEXT NOT NULL,
  file_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Ratings
CREATE TABLE public.ratings (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id),
  rater_id      UUID REFERENCES public.users(id),
  rated_id      UUID REFERENCES public.users(id),
  score         SMALLINT CHECK (score BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, rater_id)
);

-- Notificaciones
CREATE TABLE public.notifications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  metadata      JSONB DEFAULT '{}',
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Transacciones / escrow secrets
CREATE TABLE public.escrow_secrets (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id),
  secret        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Pending transactions (firma wallet)
CREATE TABLE public.pending_transactions (
  id            BIGSERIAL PRIMARY KEY,
  task_id       BIGINT REFERENCES public.tasks(id),
  user_id       UUID REFERENCES public.users(id),
  xdr           TEXT NOT NULL,
  type          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

#### 1.2 Esquema `enterprise` (portal empresas)

```sql
CREATE SCHEMA enterprise;

CREATE TABLE enterprise.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  owner_id      UUID REFERENCES public.users(id),
  plan          TEXT DEFAULT 'starter',
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE enterprise.members (
  id            BIGSERIAL PRIMARY KEY,
  org_id        UUID REFERENCES enterprise.organizations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Tareas internas de empresa (convergen al marketplace si se publican)
CREATE TABLE enterprise.tasks (
  id            BIGSERIAL PRIMARY KEY,
  org_id        UUID REFERENCES enterprise.organizations(id) ON DELETE CASCADE,
  marketplace_task_id BIGINT REFERENCES public.tasks(id),  -- null = privada
  is_public     BOOLEAN DEFAULT FALSE,
  internal_notes TEXT,
  assigned_department TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

#### 1.3 Row Level Security (RLS)

```sql
-- Activar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- (etc. para todas las tablas)

-- Políticas clave:
-- USERS: cada uno ve/edita su propio perfil; todos pueden ver perfiles públicos
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_self_update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- TASKS: abiertas son públicas; asignadas solo las partes
CREATE POLICY "tasks_open_read" ON public.tasks FOR SELECT
  USING (status = 'open' OR creator_id = auth.uid() OR accepted_applicant_id = auth.uid());
CREATE POLICY "tasks_creator_insert" ON public.tasks FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- MESSAGES: solo los participantes de la tarea
CREATE POLICY "messages_participants_read" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.creator_id = auth.uid() OR t.accepted_applicant_id = auth.uid())
    )
  );
```

#### 1.4 Triggers para automatización

```sql
-- Auto-crear perfil en public.users cuando se registra en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_username',
             split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### FASE 2 — Migración de Datos (3-5 días)

**Objetivo**: migrar los datos de MySQL a PostgreSQL sin pérdida.

#### 2.1 Script de exportación desde MySQL

```bash
# Exportar cada tabla a CSV
mysql -u arcusxon_owner -p arcusxon_users \
  -e "SELECT * FROM users INTO OUTFILE '/tmp/users.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '\"'"
# (repetir para tasks, messages, disputes, ratings, notifications)
```

#### 2.2 Transformación y carga

```typescript
// scripts/migrate.ts — ejecutar con: npx tsx scripts/migrate.ts
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 1. Crear usuarios en auth.users via Admin API (mantienen mismo email)
// 2. Insertar en public.users con UUID generado
// 3. Migrar tasks (mapear user_id integer → UUID)
// 4. Migrar messages, proposals, ratings, notificaciones
// 5. Migrar escrow_secrets y pending_transactions
```

**Regla crítica**: los IDs de MySQL son `INT`; los de Supabase son `UUID`. Hay que mantener una tabla de mapeo `{ old_int_id, new_uuid }` durante la migración y actualizar todas las foreign keys.

#### 2.3 Validación post-migración

```sql
-- Verificar conteos
SELECT 
  (SELECT COUNT(*) FROM public.users) as users,
  (SELECT COUNT(*) FROM public.tasks) as tasks,
  (SELECT COUNT(*) FROM public.messages) as messages,
  (SELECT COUNT(*) FROM public.disputes) as disputes;
```

---

### FASE 3 — Edge Functions (2 semanas)

**Objetivo**: reemplazar cada archivo PHP por una Edge Function en Deno/TypeScript.

#### 3.1 Estructura de Edge Functions

```
supabase/functions/
├── _shared/
│   ├── auth.ts          # extraer user de JWT Supabase
│   ├── cors.ts          # headers CORS reutilizables
│   ├── response.ts      # helpers json/error
│   └── stellar.ts       # helpers Stellar/Trustless Work
│
├── marketplace/
│   ├── tasks/
│   │   ├── create/      # POST   → create_task.php
│   │   ├── list/        # GET    → get_tasks.php
│   │   ├── details/     # GET    → get_task_details.php
│   │   ├── cancel/      # POST   → cancel_task.php
│   │   └── complete/    # POST   → complete_task.php
│   ├── proposals/
│   │   ├── apply/       # POST   → apply_task.php
│   │   ├── list/        # GET    → get_task_proposals.php
│   │   └── select/      # POST   → select_proposal.php
│   ├── escrow/
│   │   ├── create/      # POST   → create_escrow.php
│   │   ├── confirm/     # POST   → confirm_escrow_signature.php
│   │   ├── secret/      # GET    → get_escrow_secret.php
│   │   ├── status/      # GET    → get_escrow_status.php
│   │   └── submit/      # POST   → submit_complete_transaction.php
│   ├── messages/
│   │   ├── send/        # POST   → send_message.php
│   │   └── list/        # GET    → get_messages.php
│   ├── disputes/
│   │   ├── create/      # POST   → create_dispute.php
│   │   ├── list/        # GET    → get_user_disputes.php
│   │   └── chat/        # GET    → get_dispute_chat.php
│   ├── ratings/
│   │   ├── create/      # POST   → create_rating.php
│   │   └── get/         # GET    → get_ratings.php
│   └── users/
│       ├── profile/     # GET    → get_user_profile.php
│       ├── update/      # POST   → update_user_profile.php
│       ├── wallet/      # POST   → register_wallet.php
│       └── stats/       # GET    → get_user_public_stats.php
│
├── enterprise/
│   ├── organizations/
│   │   ├── create/
│   │   └── settings/
│   └── tasks/
│       ├── create-internal/
│       └── publish-to-marketplace/
│
└── admin/
    ├── users/           # admin_actions.php (get_users, update_user, etc.)
    ├── disputes/        # admin_release_dispute_funds.php
    └── stats/           # get_stats.php
```

#### 3.2 Ejemplo: Edge Function `tasks/create`

```typescript
// supabase/functions/marketplace/tasks/create/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../../../_shared/cors.ts';
import { getUser } from '../../../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const user = await getUser(supabase);
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const { title, subtitle, description, price, currency, difficulty, category } = await req.json();

    // Validaciones
    if (!title || !description || !price || price <= 0) {
      return new Response(JSON.stringify({ error: 'Campos requeridos faltantes' }), { status: 400, headers: corsHeaders });
    }

    // Verificar límites de usuario
    const { data: userData } = await supabase
      .from('users')
      .select('cooldown_until, tasks_today')
      .eq('id', user.id)
      .single();

    if (userData?.cooldown_until && new Date(userData.cooldown_until) > new Date()) {
      return new Response(JSON.stringify({ error: 'En período de cooldown' }), { status: 429, headers: corsHeaders });
    }

    // Crear tarea
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title, subtitle, description, price, currency: currency || 'USDC', difficulty, category, creator_id: user.id })
      .select()
      .single();

    if (error) throw error;

    // Actualizar límites (usar RPC para atomicidad)
    await supabase.rpc('increment_user_task_limits', { p_user_id: user.id });

    return new Response(JSON.stringify({ success: true, task_id: task.id }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
```

#### 3.3 Shared: auth.ts y cors.ts

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Supabase maneja CORS a nivel de proyecto
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// supabase/functions/_shared/auth.ts
export async function getUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
```

#### 3.4 Prioridad de implementación (orden)

1. `users/profile` + `users/update` — base de todo
2. `tasks/create` + `tasks/list` + `tasks/details` — flujo principal
3. `proposals/apply` + `proposals/select` — ciclo de vida de tarea
4. `escrow/create` + `escrow/confirm` + `escrow/submit` — flujo de pago crítico
5. `messages/send` + `messages/list` — reemplazar con Realtime después
6. `disputes/*` — disputa completa
7. `ratings/*` + `notifications/*` — secundarios
8. `admin/*` — panel admin

---

### FASE 4 — Realtime (Chat y Notificaciones) (1 semana)

**Objetivo**: eliminar el polling de mensajes y notificaciones; usar WebSockets de Supabase.

#### 4.1 Chat en tiempo real

```typescript
// En SuperviseTask.tsx — reemplazar el intervalo de polling actual
const channel = supabase
  .channel(`task-${taskId}-messages`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `task_id=eq.${taskId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new as Message]);
  })
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

#### 4.2 Notificaciones en tiempo real

```typescript
const notifChannel = supabase
  .channel(`user-${userId}-notifications`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    addNotification(payload.new);
  })
  .subscribe();
```

#### 4.3 Trigger PostgreSQL para notificaciones automáticas

```sql
-- Ejemplo: notificar al creador cuando alguien aplica a su tarea
CREATE OR REPLACE FUNCTION notify_on_proposal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT
    t.creator_id,
    'new_proposal',
    'Nueva propuesta recibida',
    'Alguien aplicó a tu tarea: ' || t.title,
    jsonb_build_object('task_id', NEW.task_id, 'proposal_id', NEW.id)
  FROM public.tasks t WHERE t.id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proposal_created
  AFTER INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION notify_on_proposal();
```

---

### FASE 5 — Storage (Avatares y Archivos) (3 días)

**Objetivo**: mover subida de archivos de disco del servidor a Supabase Storage.

#### 5.1 Configurar buckets

```sql
-- Desde el dashboard de Supabase o via CLI:
-- Bucket "avatars": público (URLs directas)
-- Bucket "task-files": privado (URLs firmadas)
-- Bucket "dispute-files": privado (acceso controlado)
```

#### 5.2 Reemplazar `upload_avatar.php`

```typescript
// En el frontend — reemplazar axios.post a upload_avatar.php
const uploadAvatar = async (file: File) => {
  const ext = file.name.split('.').pop();
  const path = `${user.id}/avatar.${ext}`;
  
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  
  if (!error) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', user.id);
  }
};
```

---

### FASE 6 — Migración del Frontend (2 semanas)

**Objetivo**: reemplazar todas las llamadas a `axios.post(API_URL + '/*.php')` por el cliente Supabase.

#### 6.1 Nuevo `config/database.ts`

```typescript
// Ya no necesitamos API_URL para PHP.
// Las Edge Functions se llaman via supabase.functions.invoke()
export { supabase } from './supabase';
```

#### 6.2 Patrón de reemplazo por servicio

**Antes (PHP)**:
```typescript
const res = await axios.post(`${API_URL}/create_task.php`, data, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Después (Supabase)**:
```typescript
// Opción A: consulta directa al DB (para CRUD simple)
const { data, error } = await supabase.from('tasks').insert(taskData).select().single();

// Opción B: Edge Function (para lógica compleja con validaciones)
const { data, error } = await supabase.functions.invoke('marketplace/tasks/create', {
  body: taskData
});
```

#### 6.3 Autenticación simplificada

**El flujo doble (Supabase → PHP JWT) se elimina**:

```typescript
// ANTES: signIn con Supabase → llama sync_supabase_user.php → guarda JWT custom
// DESPUÉS: signIn con Supabase → el trigger crea el perfil automáticamente

// authService.ts simplificado
export const authService = {
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) throw error;
  },
  
  isAuthenticated() {
    // Supabase maneja la sesión internamente
    return supabase.auth.getSession().then(({ data }) => !!data.session);
  },
  
  getUser() {
    return supabase.auth.getUser().then(({ data }) => data.user);
  }
};
// Ya no hay token en localStorage — Supabase usa cookies/sessionStorage internamente
```

#### 6.4 Servicios a migrar (por prioridad)

| Servicio | Archivo actual | Estrategia |
|---------|---------------|-----------|
| Auth | `authService.ts` | Eliminar JWT custom, usar `supabase.auth` directo |
| Tareas | calls en `dashboard.tsx` | `supabase.from('tasks')` directo |
| Propuestas | `ProposalReview.tsx` | Edge Function `proposals/apply` |
| Escrow | `trustlessWorkEscrowService.ts` | Edge Function `escrow/*` (requiere lógica server-side) |
| Mensajes | `SuperviseTask.tsx` | `supabase.realtime` + `supabase.from('messages')` |
| Disputas | `disputeService.ts` | Edge Functions `disputes/*` |
| Ratings | `ratingService.ts` | `supabase.from('ratings')` directo |
| Notificaciones | `notificationService.ts` | `supabase.realtime` |
| Perfil | `profileService.ts` | `supabase.from('users')` + Storage para avatar |
| Admin | `adminService.ts` | Edge Functions `admin/*` con service_role |

---

### FASE 7 — Portal Empresas (Convergencia) (1 semana)

**Objetivo**: conectar el portal empresas (`empresas.arcusx.pro`) al mismo Supabase pero con contexto enterprise.

#### 7.1 Cómo convergen los dos portales

```
Portal Público (arcusx.pro)         Portal Empresas (empresas.arcusx.pro)
        │                                       │
        ▼                                       ▼
  public.tasks (status='open')       enterprise.tasks (is_public=false)
        │                                       │
        └───────────────┬───────────────────────┘
                        │ Cuando empresa publica tarea:
                        ▼
              enterprise.tasks.is_public = TRUE
              enterprise.tasks.marketplace_task_id → public.tasks.id
```

- Las empresas pueden crear tareas **privadas** (solo visibles internamente) o **publicarlas al marketplace** (aparecen en `arcusx.pro`)
- Los freelancers del marketplace aplican a tareas públicas sin saber si vienen de empresa o no
- Las empresas ven propuestas y gestionan desde su panel, pero el escrow/pago es el mismo flujo de Trustless Work

#### 7.2 Detección del portal en el frontend

```typescript
// src/config/enterpriseSite.ts — sin cambios en la detección
// Solo cambiar la fuente de datos:

// ANTES: axios.post(`${API_URL}/some_enterprise_endpoint.php`)
// DESPUÉS:
const supabaseEnterprise = createClient(SUPABASE_URL, ANON_KEY);
// La RLS de Supabase maneja qué datos puede ver cada usuario según su rol en enterprise.members
```

#### 7.3 Nuevas Edge Functions enterprise

```
enterprise/organizations/create     — crear org
enterprise/organizations/invite     — invitar miembros
enterprise/tasks/create-internal    — crear tarea privada
enterprise/tasks/publish            — publicar al marketplace
enterprise/billing/upgrade          — cambiar plan
```

---

### FASE 8 — Admin Panel (1 semana)

**Objetivo**: reemplazar `admin.php` + `admin_actions.php` usando service_role de Supabase.

#### 8.1 Autenticación admin

```typescript
// Las Edge Functions admin usan SUPABASE_SERVICE_ROLE_KEY
// que bypassa RLS y tiene acceso total
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
```

#### 8.2 Roles en base de datos

```sql
-- Tabla de admins (separada de RLS pública)
CREATE TABLE admin.admins (
  user_id UUID PRIMARY KEY REFERENCES public.users(id),
  level   TEXT DEFAULT 'moderator' CHECK (level IN ('moderator','super'))
);

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM admin.admins WHERE user_id = uid);
$$;
```

---

### FASE 9 — Cutover (3 días)

**Objetivo**: cortar el tráfico del backend PHP y apuntar todo a Supabase.

#### 9.1 Estrategia de cutover (Blue-Green)

```
Semana antes:
  - Supabase en producción (nuevo)
  - PHP backend sigue respondiendo (viejo)
  - Frontend con feature flag: VITE_USE_SUPABASE=true|false
  
Día del cutover:
  1. Migración final de datos (delta de los últimos N días)
  2. VITE_USE_SUPABASE=true → rebuild y deploy del frontend
  3. DNS/CNAME: arcusx.pro/api → ya no necesario (todas las llamadas van a Supabase)
  4. Mantener PHP en modo read-only 48h por si necesitamos rollback
  5. Apagar cPanel después de 48h sin incidencias
```

#### 9.2 Cambios de `.env` en el frontend

```env
# ELIMINAR:
VITE_API_URL=

# MANTENER/AJUSTAR:
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TRUSTLESS_WORK_API_KEY=...
VITE_PLATFORM_WALLET=G...
VITE_ADMIN_WALLET=G...
VITE_STELLAR_NETWORK=testnet
```

---

## 4. Timeline Consolidado

| Fase | Duración | Dependencias |
|------|----------|-------------|
| 0 — Preparación | 1 sem | — |
| 1 — Esquema PostgreSQL | 1 sem | Fase 0 |
| 2 — Migración de datos | 3-5 días | Fase 1 |
| 3 — Edge Functions | 2 sem | Fase 1 |
| 4 — Realtime | 1 sem | Fase 3 (messages) |
| 5 — Storage | 3 días | Fase 0 |
| 6 — Frontend | 2 sem | Fase 3 completa |
| 7 — Portal Empresas | 1 sem | Fase 6 |
| 8 — Admin Panel | 1 sem | Fase 6 |
| 9 — Cutover | 3 días | Todas completas |
| **TOTAL** | **~10 semanas** | |

---

## 5. Qué se Gana vs. Qué Hay que Tener Cuidado

### Ganancias

| Área | PHP/MySQL actual | Supabase target |
|------|-----------------|-----------------|
| Auth | JWT custom HS256 + Supabase OAuth = doble sistema | JWT Supabase unificado |
| Tiempo real | Polling cada N segundos | WebSockets nativos (Realtime) |
| Seguridad | CORS manual en 65 archivos | RLS en base de datos |
| Escalabilidad | Hosting compartido cPanel | Edge Functions globales (CDN) |
| Storage | Disco del servidor | Supabase Storage + CDN |
| Tipos | PHP sin tipos | TypeScript end-to-end |
| CI/CD | FTP manual | `supabase db push` + GitHub Actions |
| Costo | cPanel mensual | Supabase Free tier → Pro según crecimiento |

### Riesgos a gestionar

| Riesgo | Mitigación |
|--------|-----------|
| IDs MySQL (INT) → UUID break | Tabla de mapeo durante migración; actualizar FKs en orden |
| JWT custom en localStorage de usuarios activos | Período de gracia: ambos backends corren en paralelo |
| Escrow secrets en DB → sensibles | Usar `supabase vault` para los secrets, no columna plana |
| Rate limits de Edge Functions en Free tier | Monitorear en staging; upgrade a Pro antes del cutover |
| RLS demasiado restrictivo → bugs de acceso | Test suite con usuarios de diferentes roles antes del cutover |

---

## 6. Checklist de Implementación

### Fase 0 — Preparación
- [ ] Crear proyecto Supabase
- [ ] Instalar Supabase CLI
- [ ] Exportar esquema MySQL a archivo `.sql`
- [ ] Inicializar estructura `supabase/` en el repo

### Fase 1 — Esquema
- [ ] Escribir migrations para schema `public`
- [ ] Escribir migrations para schema `enterprise`
- [ ] Activar RLS en todas las tablas
- [ ] Escribir políticas RLS por tabla
- [ ] Crear trigger `on_auth_user_created`
- [ ] Crear triggers `updated_at`
- [ ] Crear RPCs para operaciones atómicas (ej: `increment_user_task_limits`)
- [ ] Crear triggers de notificación

### Fase 2 — Datos
- [ ] Exportar datos de MySQL en CSV
- [ ] Escribir script de transformación INT → UUID
- [ ] Importar usuarios (respetando emails para auth.users)
- [ ] Importar tareas, propuestas, mensajes, disputas
- [ ] Validar conteos
- [ ] Verificar relaciones FK

### Fase 3 — Edge Functions
- [ ] `_shared/cors.ts`, `_shared/auth.ts`, `_shared/response.ts`
- [ ] `users/profile` (GET + POST)
- [ ] `tasks/create`, `tasks/list`, `tasks/details`
- [ ] `proposals/apply`, `proposals/select`
- [ ] `escrow/create`, `escrow/confirm`, `escrow/submit`
- [ ] `messages/send`, `messages/list`
- [ ] `disputes/create`, `disputes/list`, `disputes/chat`
- [ ] `ratings/create`, `ratings/get`
- [ ] `admin/*`

### Fase 4 — Realtime
- [ ] Migrar chat de polling a `supabase.channel()`
- [ ] Migrar notificaciones a Realtime
- [ ] Testear latencia en producción

### Fase 5 — Storage
- [ ] Crear buckets `avatars`, `task-files`, `dispute-files`
- [ ] Migrar lógica de `upload_avatar.php`
- [ ] Migrar `manage_portfolio.php`
- [ ] Migrar `get_dispute_files.php`

### Fase 6 — Frontend
- [ ] Simplificar `authService.ts` (eliminar JWT custom)
- [ ] Migrar `dashboard.tsx` (llamadas a tareas)
- [ ] Migrar `trustlessWorkEscrowService.ts`
- [ ] Migrar `disputeService.ts`
- [ ] Migrar `ratingService.ts`
- [ ] Migrar `notificationService.ts`
- [ ] Migrar `profileService.ts`
- [ ] Migrar `adminService.ts`
- [ ] Eliminar `API_URL` de config

### Fase 7 — Empresas
- [ ] Schema `enterprise.*`
- [ ] Edge Functions enterprise
- [ ] Lógica de convergencia marketplace

### Fase 8 — Admin
- [ ] Edge Functions admin con service_role
- [ ] Tabla `admin.admins`

### Fase 9 — Cutover
- [ ] Feature flag frontend
- [ ] Migración delta de datos
- [ ] Deploy con `VITE_USE_SUPABASE=true`
- [ ] Monitorear 48h
- [ ] Apagar PHP backend
