-- Script para crear la tabla task_progress
-- Ejecutar este script en la base de datos

CREATE TABLE IF NOT EXISTS task_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  progress_type ENUM(
    'started', 
    'delivery', 
    'message', 
    'milestone', 
    'cancellation_requested', 
    'cancellation_approved', 
    'cancellation_rejected'
  ) NOT NULL,
  description TEXT,
  files JSON NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_user (task_id, user_id),
  INDEX idx_task_type (task_id, progress_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

