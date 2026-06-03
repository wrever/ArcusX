import axios from '../config/axios';
import { arcusxApiUrl } from '../config/arcusxApi';

export interface PrivateOfferTask {
  id: number;
  title: string;
  subtitle?: string;
  description: string;
  price: string | number;
  currency: string;
  difficulty: string;
  category: string;
  created_at: string;
  status: string;
  creator_username: string;
  creator_id?: number;
  creator_verified?: boolean;
  creator_verified_enterprise?: boolean;
  creator_verified_individual?: boolean;
  my_application_count: number;
  escrow_id?: string | null;
  escrow_status?: string | null;
  accepted_applicant_id?: number | null;
  is_funded?: boolean;
}

export async function fetchPrivateOffers(): Promise<PrivateOfferTask[]> {
  const { data } = await axios.get<{ success?: boolean; offers?: PrivateOfferTask[]; message?: string }>(
    `${arcusxApiUrl('get_private_offers')}`,
  );
  if (data && data.success === false) {
    throw new Error(data.message || 'Error al cargar ofertas');
  }
  return Array.isArray(data?.offers) ? data.offers : [];
}
