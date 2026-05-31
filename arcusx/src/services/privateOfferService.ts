import axios from '../config/axios';
import { arcusxApiUrl } from '../config/arcusxApi';

export interface FinalizePrivateOfferPayload {
  task_id: number;
  invited_user_id: number;
  worker_wallet_address: string;
  escrow_id: string;
  transaction_hash?: string;
  escrow_amount?: number;
  platform_fee?: number;
  client_wallet_address?: string;
}

export async function finalizePrivateOffer(
  payload: FinalizePrivateOfferPayload,
): Promise<{ success: boolean; message?: string }> {
  const token = localStorage.getItem('token');
  const response = await axios.post(arcusxApiUrl('finalize_private_offer'), payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}
