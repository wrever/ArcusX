/**
 * Tipos TypeScript para la funcionalidad de Freelancers
 */

export interface Freelancer {
  id: number;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  average_rating: number;
  total_ratings: number;
  tasks_completed: number;
  total_earned: number;
  skills?: string[];
  public_profile: boolean;
  joined_date: string;
  /** Wallet G… registrada para cobrar ofertas privadas */
  has_payout_wallet?: boolean;
  /** Presente en API reciente; el front calcula has_payout_wallet si falta */
  private_payout_wallet?: string | null;
}

export interface FreelancersResponse {
  success: boolean;
  freelancers: Freelancer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface FreelancerFilters {
  search?: string;
  minRating?: number;
  minTasks?: number;
  skills?: string[];
  sortBy?: 'rating' | 'tasks_completed' | 'joined_date' | 'total_earned';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  /** Si true, el backend ordena primero por perfil (foto, bio, skills) y luego por sortBy. */
  preferProfile?: boolean;
}

