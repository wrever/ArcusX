import type { SupabaseClient } from '@supabase/supabase-js';

export async function logDomainEvent(
  supabase: SupabaseClient,
  params: {
    entity_type: string;
    entity_id: string | number;
    event_type: string;
    actor_user_id?: number | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await supabase.from('arcusx_domain_events').insert({
    entity_type: params.entity_type,
    entity_id: String(params.entity_id),
    event_type: params.event_type,
    actor_user_id: params.actor_user_id ?? null,
    payload: params.payload ?? null,
  });
  if (error) console.error('[logDomainEvent]', error.message);
}
