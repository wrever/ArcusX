/** Week 1 — types stub; methods wired in Week 2. */

export type ArcusXCurrency = 'USDC';

export interface TaskSummary {
  id: number;
  title: string;
  price: number;
  status: string;
  category?: string;
}

export interface DealSummary {
  id: number;
  title: string;
  status: string;
  amount_usdc?: number;
}

export interface EscrowStatus {
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_release_tx_hash?: string | null;
}

export interface ApiErrorBody {
  success?: false;
  error?: string;
  message?: string;
}
