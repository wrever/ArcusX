/** Tipos compartidos cliente escrow nativo (Supabase Edge). */

export interface FeeQuote {
  worker_amount: string;
  client_fee: string;
  client_total: string;
  freelancer_fee: string;
  freelancer_payout: string;
  platform_total: string;
  client_fee_bps: number;
  freelancer_fee_bps: number;
}

export type EscrowStatus =
  | 'pending_funding'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled';
