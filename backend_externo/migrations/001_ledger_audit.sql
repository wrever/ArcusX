-- ArcusX DB Migration: Ledger + Audit events
-- Ejecuta esto en tu MySQL/MariaDB (idealmente en staging primero).

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  entry_type VARCHAR(32) NOT NULL,
  amount DECIMAL(20,7) NOT NULL DEFAULT 0,
  asset_code VARCHAR(16) NOT NULL DEFAULT 'USDC',
  user_id BIGINT NULL,
  task_id BIGINT NULL,
  escrow_id BIGINT NULL,
  dispute_id BIGINT NULL,
  tx_hash VARCHAR(128) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ledger_event (event_id),
  KEY idx_ledger_user (user_id),
  KEY idx_ledger_task (task_id),
  KEY idx_ledger_escrow (escrow_id),
  KEY idx_ledger_type (entry_type)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_audit_event (event_type, event_id),
  KEY idx_audit_user (user_id),
  KEY idx_audit_type (event_type)
);
