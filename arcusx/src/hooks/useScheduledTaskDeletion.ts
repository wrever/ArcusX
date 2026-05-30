/**
 * Hook para verificar y eliminar tareas programadas automáticamente
 * Se ejecuta cuando el usuario carga el dashboard o supervisa una tarea
 */

import { useEffect } from 'react';
import { arcusxApiUrl } from '../config/arcusxApi';

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
        const response = await fetch(arcusxApiUrl('delete_scheduled_tasks', { cron_token: 'arcusx_scheduled_deletion_2025' }), {
          method: 'GET',
          mode: 'cors',
        });

        if (response.ok) {
          await response.json();
          // Tareas eliminadas automáticamente
        }
      } catch (error) {
        // Error silencioso - no afecta la experiencia del usuario
      }
    };

    // Ejecutar inmediatamente
    checkAndDeleteScheduledTasks();

    // Ejecutar cada 5 minutos
    const interval = setInterval(checkAndDeleteScheduledTasks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}

