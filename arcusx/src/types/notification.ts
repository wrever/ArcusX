export interface Notification {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  is_global: boolean;
  is_read: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  unread_count: number;
}
