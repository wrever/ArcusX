/**
 * Tipos TypeScript para el sistema de perfiles de usuario
 */

export interface UserProfile {
  id: number;
  username: string;
  email?: string; // Solo visible para el dueño del perfil
  avatar_url?: string;
  bio?: string;
  portfolio_url?: string;
  verified: boolean;
  kyc_verified?: boolean;
  display_name?: string;
  public_badges?: string[];
  public_profile: boolean;
  member_since: string;
  skills: Skill[];
  portfolio: PortfolioItem[];
  statistics: UserStatistics;
}

export interface Skill {
  id?: number;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface PortfolioItem {
  id: number;
  title: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

export interface UserStatistics {
  tasks_completed: number;
  tasks_created: number;
  total_earned: number;
  total_spent: number;
  average_rating: number;
  total_ratings: number;
  completion_rate: number;
  response_time_avg?: string;
  member_since?: string;
}

export interface UpdateProfileData {
  username?: string;
  bio?: string;
  portfolio_url?: string;
  public_profile?: boolean;
  skills?: Skill[];
}

export interface CreatePortfolioItemData {
  title: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  category?: string;
}

export interface UpdatePortfolioItemData {
  id: number;
  title?: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  category?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile?: UserProfile;
  message?: string;
}

export interface PortfolioResponse {
  success: boolean;
  portfolio?: PortfolioItem[];
  message?: string;
}

export interface StatsResponse {
  success: boolean;
  stats?: UserStatistics;
  message?: string;
}

