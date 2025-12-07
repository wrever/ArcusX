/**
 * Hook para verificar y eliminar tareas programadas automáticamente
 * Se ejecuta cuando el usuario carga el dashboard o supervisa una tarea
 */

import { useEffect } from 'react';
import { API_URL } from '../config/database';

/**
 * Hook para verificar y eliminar tareas programadas
 * Se ejecuta automáticamente cuando el componente se monta
 */
export function useScheduledTaskDeletion() {
  useEffect(() => {
    const checkAndDeleteScheduledTasks = async () => {
      try {
        // Llamar al endpoint para eliminar tareas programadas
        // Este endpoint puede ser llamado sin autenticación si es necesario
        const response = await fetch(`${API_URL}/auth/delete_scheduled_tasks.php?cron_token=arcusx_scheduled_deletion_2025`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.deleted_count > 0) {
            console.log(`✅ ${data.deleted_count} tarea(s) eliminada(s) automáticamente`);
          }
        }
      } catch (error) {
        // No mostrar error al usuario, solo loggear
        console.warn('Error al verificar tareas programadas:', error);
      }
    };

    // Ejecutar inmediatamente
    checkAndDeleteScheduledTasks();

    // Ejecutar cada 5 minutos
    const interval = setInterval(checkAndDeleteScheduledTasks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}

