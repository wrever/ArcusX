import { useEffect, useRef } from 'react';
import { supabase, hasSupabase } from '../config/supabase';

type Options = {
  enabled?: boolean;
  onInsert?: () => void;
};

/**
 * Escucha INSERT en arcusx_notifications (RLS filtra por usuario).
 * Reemplaza polling agresivo en dashboard.
 */
export function useNotificationsRealtime({ enabled = true, onInsert }: Options) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!enabled || !hasSupabase) return;

    const channel = supabase
      .channel('arcusx-notifications-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'arcusx_notifications' },
        () => {
          onInsertRef.current?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
