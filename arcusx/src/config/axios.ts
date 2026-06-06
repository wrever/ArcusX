import axios from 'axios';
import { supabaseAnonKey } from './supabase';
import { useSupabaseApi } from './arcusxApi';

const axiosInstance = axios.create({
  baseURL: useSupabaseApi && import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arcusx-api`
    : '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('supabase_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (supabaseAnonKey && !config.headers.apikey) {
      config.headers.apikey = supabaseAnonKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { supabase, hasSupabase } = await import('../config/supabase');
        if (hasSupabase) await supabase.auth.signOut();
      } catch {
        // Ignorar
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

