import axios from '../config/axios';
import { API_URL } from '../config/database';

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
  my_application_count: number;
}

export async function fetchPrivateOffers(): Promise<PrivateOfferTask[]> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }
  const { data } = await axios.get<{ success?: boolean; offers?: PrivateOfferTask[]; message?: string }>(
    `${API_URL}/auth/get_private_offers.php`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (data && data.success === false) {
    throw new Error(data.message || 'Error al cargar ofertas');
  }
  return Array.isArray(data?.offers) ? data.offers : [];
}
