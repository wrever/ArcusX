import { API_URL } from '../config/database';

export type AuditEventType =
  | 'escrow_create_attempt'
  | 'escrow_create_success'
  | 'escrow_create_failure'
  | 'dispute_start'
  | 'dispute_resolve';

export async function sendAuditEvent(
  eventType: AuditEventType,
  eventId: string,
  payload: any,
  token?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${API_URL}/audit_event.php`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType,
        event_id: eventId,
        payload
      })
    });
  } catch {
    // Silencioso: auditoría nunca debe romper el flujo de negocio
  }
}
