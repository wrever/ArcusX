import { useEffect, useRef } from 'react';
import { supabase, hasSupabase } from '../config/supabase';

type Options = {
  taskId: number | null;
  enabled?: boolean;
  onChange?: () => void;
};

/**
 * Escucha mensajes de tarea (INSERT/UPDATE). RLS limita a participantes.
 */
export function useTaskMessagesRealtime({ taskId, enabled = true, onChange }: Options) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !hasSupabase || !taskId || !Number.isFinite(taskId)) return;

    const channel = supabase
      .channel(`arcusx-task-messages-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arcusx_task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          onChangeRef.current?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, taskId]);
}
