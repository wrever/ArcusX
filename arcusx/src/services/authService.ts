import axios from 'axios';
import { API_URL } from '../config/database';
import { supabase, hasSupabase } from '../config/supabase';

// Función para verificar si un token JWT ha expirado
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true; // Si hay error al decodificar, considerar como expirado
  }
};

export const authService = {
  async logout() {
    try {
      if (hasSupabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignorar errores de Supabase (ej. sin red o no configurado)
    } finally {
      // Siempre limpiar todo para que la sesión quede cerrada
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase.auth.token');
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    // Verificar si el token ha expirado
    if (isTokenExpired(token)) {
      // Si el token ha expirado, limpiar localStorage
      this.logout();
      return false;
    }
    
    return true;
  },

  getToken() {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Funciones para autenticación con Supabase OAuth
  async signInWithGoogle() {
    if (!hasSupabase) {
      throw new Error('Login con Google no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    }
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Usar skipBrowserRedirect para interceptar la URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Interceptar la redirección
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async signInWithGitHub() {
    if (!hasSupabase) {
      throw new Error('Login con GitHub no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    }
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Usar skipBrowserRedirect para interceptar la URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Interceptar la redirección
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async handleSupabaseCallback() {
    if (!hasSupabase) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (!session?.user) {
        return null;
      }

      const syncResponse = await axios.post(`${API_URL}/auth/sync_supabase_user.php`, {
        supabase_user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
        avatar_url: session.user.user_metadata?.avatar_url || null
      });
      
      if (syncResponse.data.success && syncResponse.data.token) {
        localStorage.setItem('token', syncResponse.data.token);
        localStorage.setItem('user', JSON.stringify(syncResponse.data.user));
        // Guardar también el access_token de Supabase por si lo necesitamos
        localStorage.setItem('supabase_access_token', session.access_token);
        return syncResponse.data;
      }
      
      throw new Error(syncResponse.data.message || 'Error al sincronizar usuario');
    } catch (error: any) {
      if (error.response) {
      }
      throw error;
    }
  },

  async getSupabaseSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      return null;
    }
  },

  async registerWallet(walletAddress: string): Promise<{ success: boolean; wallet_address?: string; already_registered?: boolean; message?: string }> {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/register_wallet.php`,
      { wallet_address: walletAddress },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async verifyWallet(): Promise<{ success: boolean; has_wallet: boolean; wallet_address?: string | null }> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/verify_wallet.php`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
}; 