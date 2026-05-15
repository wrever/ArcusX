# ArcusX — Spec técnico del Referral Program
## $0.5 USDC por referido · Cap $30/día · Sistema anti-Sybil
### Versión 1.0 · Mayo 2026

---

## Resumen ejecutivo

Este documento especifica el diseño completo del sistema de referidos para ArcusX, incluyendo la estructura de base de datos, la lógica de negocio, las capas de verificación anti-Sybil y los casos edge críticos.

**Parámetros del programa:**
- Recompensa por referido: **$0.50 USDC**
- Cap diario por referidor: **$30.00 USDC** (máx 60 referidos pagados/día)
- Trigger de pago: **Primer task completado por el referido** (no el registro)
- Delay de seguridad: **24 horas** tras la activación antes del pago
- Expiración del referido: **30 días** sin activación → expirado automáticamente

---

## Análisis del codebase existente

### Defensas ya implementadas (reutilizar)

| Mecanismo | Archivo | Estado |
|-----------|---------|--------|
| OAuth obligatorio (Google/GitHub) | `authService.ts`, `sync_supabase_user.php` | ✅ Activo |
| 1 wallet única por usuario | `register_wallet.php` | ✅ Activo |
| 1 email único por usuario | `sync_supabase_user.php` | ✅ Activo |
| Rate limiting por usuario | `get_user_limits.php`, `user_task_limits` | ✅ Activo |
| JWT con expiración 24h | `auth_bearer.php` | ✅ Activo |

### Gaps a implementar

| Mecanismo | Prioridad | Razón |
|-----------|-----------|-------|
| IP logging en registro | 🔴 Crítico | Sin esto, bot farms pasan desapercibidas |
| Tabla `referrals` | 🔴 Crítico | No hay trazabilidad de referidos |
| Trigger de activación por task | 🔴 Crítico | Sin esto, el pago en registro es explotable |
| Device fingerprinting (ligero) | 🟡 Importante | Detecta multi-cuenta mismo dispositivo |
| Antigüedad mínima de cuenta | 🟡 Importante | Elimina ataques de volumen en ventana corta |
| Panel de revisión manual en admin | 🟡 Importante | Necesario para revisar flags |

---

## Estructura de base de datos

### Tabla: `referrals`

```sql
CREATE TABLE referrals (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id       INT NOT NULL,                           -- FK users.id (quien refirió)
  referred_id       INT,                                    -- FK users.id (quien fue referido, NULL hasta que se registra)
  ref_code          VARCHAR(32) NOT NULL UNIQUE,            -- Código único del link: arcusx.pro/ref/{ref_code}
  status            ENUM('pending','active','paid','expired','flagged') DEFAULT 'pending',
  referrer_ip       VARCHAR(45),                            -- IP del referidor al momento de generarse el link
  referred_ip       VARCHAR(45),                            -- IP del referido al registrarse
  device_fp         VARCHAR(64),                            -- Hash SHA-256 del fingerprint del referido
  registered_at     TIMESTAMP NULL,                         -- Cuándo se registró el referido
  activated_at      TIMESTAMP NULL,                         -- Cuándo completó su primer task
  eligible_at       TIMESTAMP NULL,                         -- activated_at + 24h (cuándo se puede pagar)
  paid_at           TIMESTAMP NULL,                         -- Cuándo se emitió el USDC
  tx_hash           VARCHAR(64),                            -- Hash de la transacción Stellar del pago
  reward_usdc       DECIMAL(10,4) DEFAULT 0.5000,           -- Monto en USDC (almacenar tasa vigente al crear)
  flagged           TINYINT(1) DEFAULT 0,                   -- 1 si tiene flags activos
  admin_override    TINYINT(1) DEFAULT 0,                   -- 1 si admin aprobó manualmente
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_id) REFERENCES users(id),
  INDEX idx_referrer (referrer_id),
  INDEX idx_referred (referred_id),
  INDEX idx_ref_code (ref_code),
  INDEX idx_status (status)
);
```

### Tabla: `referral_daily_caps`

```sql
CREATE TABLE referral_daily_caps (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id       INT NOT NULL,
  cap_date          DATE NOT NULL,                          -- Fecha en UTC
  referrals_paid    INT DEFAULT 0,                          -- Cuántos referidos pagados ese día
  usdc_paid         DECIMAL(10,4) DEFAULT 0.0000,           -- USDC total pagado ese día
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_referrer_date (referrer_id, cap_date),
  FOREIGN KEY (referrer_id) REFERENCES users(id)
);
```

### Tabla: `referral_flags`

```sql
CREATE TABLE referral_flags (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  referral_id       INT NOT NULL,
  flag_type         ENUM(
                      'ip_match',          -- IP del referido = IP del referidor
                      'ip_cluster',        -- Misma IP en 3+ referidos del mismo referidor en 24h
                      'device_fp_match',   -- Fingerprint repetido en múltiples cuentas
                      'velocity',          -- >5 referidos en 24h del mismo referidor
                      'new_account',       -- Referidor con cuenta < 72h
                      'no_activity',       -- Referido sin actividad en 7 días
                      'username_pattern',  -- Username auto-generado sospechoso
                      'manual'             -- Añadido manualmente por admin
                    ) NOT NULL,
  flag_detail       TEXT,                                   -- Descripción del flag
  resolution        ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by       INT,                                    -- FK users.id (admin)
  reviewed_at       TIMESTAMP NULL,
  review_note       TEXT,                                   -- Nota del admin
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (referral_id) REFERENCES referrals(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_referral (referral_id),
  INDEX idx_resolution (resolution)
);
```

### Campo a agregar en tabla `users` existente

```sql
-- Agregar a la tabla users existente:
ALTER TABLE users
  ADD COLUMN registration_ip  VARCHAR(45) NULL,        -- IP al momento del registro
  ADD COLUMN device_fp        VARCHAR(64) NULL,        -- Fingerprint de dispositivo en registro
  ADD COLUMN ref_code_used    VARCHAR(32) NULL,        -- Código de referido que usó al registrarse
  ADD COLUMN account_age_ok   TINYINT(1) DEFAULT 0;   -- Flag: cuenta tiene 48h+ (actualizable por cron)
```

---

## Lógica de generación del link de referido

### Formato del link
```
https://arcusx.pro/ref/{REF_CODE}
```

### Generación del código
```php
// En generate_referral_link.php (nuevo endpoint)
function generateRefCode($userId) {
    // Formato: {userId en base36}_{6 chars aleatorios}
    // Ejemplo: 1a2_x9k3m7
    $base36Id = base_convert($userId, 10, 36);
    $random = substr(str_shuffle('abcdefghjkmnpqrstuvwxyz23456789'), 0, 6);
    return $base36Id . '_' . $random;
}
// Almacenar en referrals.ref_code con referrer_id, referred_id NULL
// El link queda "abierto" esperando que alguien lo use
```

### Validación al usar el link (register.php o sync_supabase_user.php)
```php
// Al registrarse con ?ref={REF_CODE}:
// 1. Verificar que ref_code existe y está en status 'pending'
// 2. Verificar que el referido no sea el mismo que el referidor
// 3. Registrar la IP del referido
// 4. Calcular device fingerprint (del cliente)
// 5. Correr checks de flags (ver sección siguiente)
// 6. Actualizar referrals SET referred_id = {nuevo_user_id}, registered_at = NOW(), status = 'active'
// 7. Actualizar users SET ref_code_used = {ref_code} WHERE id = {nuevo_user_id}
```

---

## Checks anti-Sybil — lógica de decisión

### Check 1: IP Match (flag `ip_match`)
```sql
-- Si la IP del referido = IP del referidor en registro
SELECT id FROM users WHERE registration_ip = '{referred_ip}' AND id = referrer_id
-- Resultado: flag type='ip_match', NO bloquear, poner en revisión manual
```

### Check 2: IP Cluster (flag `ip_cluster`)
```sql
-- Si 3+ referidos del mismo referidor tienen la misma IP
SELECT COUNT(*) FROM referrals r
  JOIN users u ON r.referred_id = u.id
  WHERE r.referrer_id = {referrer_id}
  AND u.registration_ip = '{referred_ip}'
  AND r.created_at > NOW() - INTERVAL 24 HOUR
-- Si COUNT >= 3: flag type='ip_cluster'
```

### Check 3: Device Fingerprint (flag `device_fp_match`)
```sql
-- Si el fingerprint del referido ya existe en otra cuenta
SELECT id FROM users WHERE device_fp = '{fp_hash}' AND id != {referred_id}
-- Si existe: flag type='device_fp_match'
```

### Check 4: Velocidad (flag `velocity`)
```sql
-- Si el referidor tiene más de 5 referidos activos en 24h
SELECT COUNT(*) FROM referrals
  WHERE referrer_id = {referrer_id}
  AND status IN ('active', 'pending', 'paid')
  AND created_at > NOW() - INTERVAL 24 HOUR
-- Si COUNT > 5: flag type='velocity' (revisión, no bloqueo)
```

### Check 5: Cuenta nueva del referidor (flag `new_account`)
```sql
-- Si el referidor tiene cuenta con menos de 72h
SELECT created_at FROM users WHERE id = {referrer_id}
-- Si NOW() - created_at < 72 horas: flag type='new_account'
```

### Check 6: Cap diario
```sql
-- Antes de pagar, verificar cap
SELECT usdc_paid FROM referral_daily_caps
  WHERE referrer_id = {referrer_id} AND cap_date = CURDATE()
-- Si usdc_paid + 0.5 > 30.0: rechazar el pago (no flag, solo cap alcanzado)
```

---

## Trigger de pago — cuándo se ejecuta

El pago se desencadena cuando se detecta que el referido completó su primer task.

### Punto de integración en el codebase existente

En `complete_task.php` (o el endpoint que marca una tarea como completada), agregar:

```php
// Al final de complete_task.php, después de actualizar status:
function checkAndQueueReferralReward($userId) {
    // 1. Verificar si este usuario fue referido
    $referral = getReferralByReferredId($userId);
    if (!$referral || $referral['status'] !== 'active') return;

    // 2. Verificar antigüedad mínima de cuenta (48h)
    $accountAge = getAccountAgeHours($userId);
    if ($accountAge < 48) return; // Aún no elegible, se revisará en cron

    // 3. Verificar que no tiene flags pendientes sin resolver
    $flags = getUnresolvedFlags($referral['id']);
    if (count($flags) > 0) {
        // Tiene flags → encolar para revisión manual, no pagar automático
        updateReferralStatus($referral['id'], 'flagged');
        return;
    }

    // 4. Calcular eligible_at = NOW() + 24h (delay de seguridad)
    updateReferral($referral['id'], [
        'activated_at' => 'NOW()',
        'eligible_at'  => 'DATE_ADD(NOW(), INTERVAL 24 HOUR)',
        'status'       => 'active' // Permanece active hasta que se pague
    ]);

    // 5. El pago real lo ejecuta el cron job (ver siguiente sección)
}
```

### Cron job de pagos (ejecutar cada hora)

```php
// cron_referral_payments.php — ejecutar cada 60 minutos
// Buscar referidos elegibles para pago:

SELECT r.*, u_referrer.wallet_address as referrer_wallet
FROM referrals r
JOIN users u_referrer ON r.referrer_id = u_referrer.id
WHERE r.status = 'active'
  AND r.flagged = 0
  AND r.eligible_at IS NOT NULL
  AND r.eligible_at <= NOW()  -- El delay de 24h ya pasó
  AND r.paid_at IS NULL
ORDER BY r.eligible_at ASC
LIMIT 100; -- Procesar en lotes de 100

-- Para cada resultado:
-- 1. Verificar cap diario del referidor
-- 2. Si cap no alcanzado: emitir pago Stellar ($0.50 USDC a referrer_wallet)
-- 3. Registrar tx_hash, paid_at, actualizar daily_cap
-- 4. Marcar referral status = 'paid'
```

---

## Dispositivo fingerprinting (implementación mínima)

No usar librerías pesadas. Un fingerprint ligero suficiente para detección:

```javascript
// En el frontend, al registrarse (authService.ts)
async function getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('ArcusX', 2, 2);
    const canvasData = canvas.toDataURL();

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        canvasData.slice(-50) // Últimos 50 chars del canvas fingerprint
    ].join('|');

    // Enviar al backend para hashear con SHA-256 server-side
    return btoa(components).slice(0, 64);
}
// Enviar como header X-Device-FP en el request de registro
```

```php
// En sync_supabase_user.php, al crear usuario:
$deviceFp = $_SERVER['HTTP_X_DEVICE_FP'] ?? null;
if ($deviceFp) {
    $deviceFp = hash('sha256', $deviceFp); // Hashear server-side
    // INSERT en users.device_fp
}
```

---

## Panel de revisión para el admin (endpoint existente)

Agregar en el admin panel existente (`admin.php` / `AdminPanel.tsx`):

### Nuevo endpoint: `get_flagged_referrals.php`
```sql
SELECT r.*, 
       u_ref.username as referrer_username,
       u_ref.email as referrer_email,
       u_referred.username as referred_username,
       u_referred.email as referred_email,
       COUNT(rf.id) as flag_count,
       GROUP_CONCAT(rf.flag_type) as flag_types
FROM referrals r
JOIN users u_ref ON r.referrer_id = u_ref.id
JOIN users u_referred ON r.referred_id = u_referred.id
JOIN referral_flags rf ON rf.referral_id = r.id AND rf.resolution = 'pending'
WHERE r.flagged = 1
GROUP BY r.id
ORDER BY r.created_at DESC;
```

### Nuevo endpoint: `resolve_referral_flag.php`
```php
// POST: { referral_id, resolution: 'approved'|'rejected', note }
// Si approved: mover a pago normal (limpiar flagged = 0)
// Si rejected: status = 'expired', no pago
```

---

## Casos edge críticos

### Caso 1: Referidor y referido en la misma casa (familia)
- **Síntoma:** IP idéntica, dispositivos diferentes (device_fp diferente)
- **Comportamiento:** Flag `ip_match` → revisión manual
- **Resolución:** Admin verifica emails OAuth distintos + wallets distintas → aprobar
- **Regla:** Si IP match pero device_fp diferente + emails reales → alta probabilidad de legítimo

### Caso 2: Freelancer que refiere en un coworking o universidad
- **Síntoma:** Múltiples cuentas desde la misma IP pública (NAT)
- **Comportamiento:** Flag `ip_cluster` si son 3+ en 24h
- **Resolución:** Admin verifica activity real (tareas completadas) → aprobar en lote
- **Prevención:** Documentar en FAQ: "Si estás en una red compartida, contacta soporte"

### Caso 3: Referido que nunca activa (abandona después de registrarse)
- **Comportamiento:** Status permanece 'active', referral no pasa a elegible
- **Regla:** A los 30 días sin `activated_at`, cron ejecuta UPDATE status = 'expired'
- **Notificación:** Email al referidor a los 7 días: "Tu referido aún no ha completado su primera tarea"

### Caso 4: Referidor que alcanza el cap de $30/día
- **Comportamiento:** Pago número 61 en adelante se encola para el día siguiente
- **No se pierden:** Se procesan al día siguiente si el cap se renueva
- **Notificación:** Push al referidor: "Alcanzaste tu límite diario de $30. Tus referidos adicionales se pagarán mañana."

### Caso 5: Task que se reversa después de completarse (dispute)
- **Comportamiento:** Si una tarea completada entra en dispute y se reversa, el referral que se activó con esa tarea debe volver a status 'pending' (esperando próxima tarea)
- **Implementación:** En el endpoint de resolución de disputes, verificar si algún referral se activó con esa task_id → reset activated_at = NULL, eligible_at = NULL

### Caso 6: El referidor cambia su wallet antes del pago
- **Comportamiento:** El pago va a la wallet activa al momento de ejecutarse el cron
- **Implementación:** El cron siempre consulta `users.wallet_address` en tiempo real, nunca cachea

### Caso 7: Referral link compartido públicamente en redes
- **Síntoma:** 500 registros en 24h con el mismo ref_code
- **Comportamiento:** Flag `velocity` después del registro 5, revisión manual
- **Resolución:** Si los referidos tienen actividad real → pagar, pero con cap diario
- **Nota:** Esto es el escenario ideal (marketing viral real). No bloquear agresivamente.

### Caso 8: Usuario que se refiere a sí mismo con VPN
- **Síntoma:** IP diferente pero device_fp idéntico
- **Comportamiento:** Flag `device_fp_match` → revisión manual
- **Resolución:** Comparar emails OAuth: si ambas cuentas tienen emails vinculados a la misma persona (mismo Google account, mismo GitHub) → rechazar

---

## Comunicación al usuario — mensajes clave

### En el dashboard del referidor:
```
Tu programa de referidos
Link de referido: arcusx.pro/ref/[TU_CODIGO] [Copiar]

Referidos este mes:    [N] activados · [M] pendientes · [P] expirados
Ganado este mes:       $[X] USDC
Cap hoy:               $[Y] / $30.00 USDC

Historial:
[usuario] · registrado hace 3 días · ⏳ Aún no completó su primera tarea
[usuario] · activó hace 1 día · ✅ Pago pendiente (disponible en 18h)
[usuario] · activado · ✅ Pagado · $0.50 USDC · 12 mayo 2026
```

### Email al referido (24h después de registrarse sin activar):
```
Asunto: Tu cuenta ArcusX está lista — falta un paso

Hola [nombre],

Te registraste en ArcusX usando el link de [referidor]. ¡Bienvenido!

Para que [referidor] reciba su recompensa y tú empieces a ganar, 
completa tu primera tarea en la plataforma.

Puede ser simple: publica una tarea o aplica a una que te interese.

[Ver tareas disponibles →]

El equipo de ArcusX
```

---

## Resumen de implementación — orden de prioridad

| Prioridad | Componente | Dificultad | Impacto anti-fraude |
|-----------|------------|-----------|---------------------|
| 🔴 1 | Tabla `referrals` + generación de links | Media | Fundamental |
| 🔴 2 | Trigger en complete_task.php | Baja | Crítico (elimina el 90% del fraude) |
| 🔴 3 | IP logging en sync_supabase_user.php | Muy baja | Alto |
| 🟡 4 | Cron de pagos + cap diario | Media | Operacional |
| 🟡 5 | Sistema de flags + panel admin | Media | Compliance |
| 🟡 6 | Device fingerprinting | Media | Complementario |
| 🟢 7 | Notificaciones y emails | Media | UX |
| 🟢 8 | Dashboard del referidor | Alta | UX |

---

*Spec preparado por el co-founder de marketing & SEO de ArcusX.*
*Para consultas técnicas sobre implementación, revisar archivos: `register_wallet.php`, `sync_supabase_user.php`, `complete_task.php`, `config.php`*
*Versión 1.0 · Mayo 2026 · Confidencial*
