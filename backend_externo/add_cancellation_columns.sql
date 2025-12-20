-- Script para agregar columnas de cancelación a la tabla tasks
-- Ejecutar este script en la base de datos

-- Verificar y agregar columna worker_started_at
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS worker_started_at DATETIME NULL 
COMMENT 'Timestamp cuando trabajador marcó que comenzó';

-- Verificar y agregar columna cancellation_requested_at
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_requested_at DATETIME NULL 
COMMENT 'Timestamp de solicitud de cancelación';

-- Verificar y agregar columna cancellation_reason
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL 
COMMENT 'Razón de cancelación';

-- Verificar y agregar columna cancellation_allowed
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_allowed BOOLEAN DEFAULT TRUE 
COMMENT 'Si cancelación está permitida';

-- Verificar y agregar columna cancellation_initiated_by
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_initiated_by INT NULL 
COMMENT 'ID del usuario que inició cancelación';

-- Verificar y agregar columna cancellation_tx_hash
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS cancellation_tx_hash VARCHAR(255) NULL 
COMMENT 'Hash de transacción de reembolso';

-- Agregar índice para búsquedas por worker_started_at
CREATE INDEX IF NOT EXISTS idx_worker_started_at ON tasks(worker_started_at);

-- Agregar índice para búsquedas por cancellation_initiated_by
CREATE INDEX IF NOT EXISTS idx_cancellation_initiated_by ON tasks(cancellation_initiated_by);

