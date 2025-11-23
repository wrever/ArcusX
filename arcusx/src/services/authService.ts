import axios from 'axios';
import { API_URL } from '../config/database';
import { supabase } from '../config/supabase';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

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
  async login(data: LoginData) {
    try {
      const response = await axios.post(`${API_URL}/auth/login.php`, data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async register(data: RegisterData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register.php`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    // Cerrar sesión de Supabase si existe
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
      }
    } catch (error) {
    }
    
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('supabase_access_token');
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
    try {
      // FORZAR SIEMPRE arcusx.one - nunca localhost
      const redirectUrl = 'https://arcusx.one/auth/callback';
      
      console.log('Google OAuth - Forzando redirect a:', redirectUrl);
      
      // Usar skipBrowserRedirect para interceptar la URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Interceptar la redirección
        }
      });
      
      if (error) {
        console.error('Error en Google OAuth:', error);
        throw error;
      }
      
      // Interceptar y corregir la URL antes de redirigir
      if (data?.url) {
        let finalUrl = data.url;
        
        // Reemplazar cualquier referencia a localhost con arcusx.one
        finalUrl = finalUrl.replace(/http:\/\/localhost:\d+/g, 'https://arcusx.one');
        finalUrl = finalUrl.replace(/https?:\/\/localhost:\d+/g, 'https://arcusx.one');
        
        // Asegurar que el redirect_uri en los query params también sea correcto
        const urlObj = new URL(finalUrl);
        const redirectUri = urlObj.searchParams.get('redirect_uri');
        if (redirectUri && redirectUri.includes('localhost')) {
          urlObj.searchParams.set('redirect_uri', redirectUrl);
          finalUrl = urlObj.toString();
        }
        
        console.log('URL corregida:', finalUrl);
        window.location.href = finalUrl;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async signInWithGitHub() {
    try {
      // FORZAR SIEMPRE arcusx.one - nunca localhost
      const redirectUrl = 'https://arcusx.one/auth/callback';
      
      console.log('GitHub OAuth - Forzando redirect a:', redirectUrl);
      
      // Usar skipBrowserRedirect para interceptar la URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true  // Interceptar la redirección
        }
      });
      
      if (error) {
        console.error('Error en GitHub OAuth:', error);
        throw error;
      }
      
      // Interceptar y corregir la URL antes de redirigir
      if (data?.url) {
        let finalUrl = data.url;
        
        // Reemplazar cualquier referencia a localhost con arcusx.one
        finalUrl = finalUrl.replace(/http:\/\/localhost:\d+/g, 'https://arcusx.one');
        finalUrl = finalUrl.replace(/https?:\/\/localhost:\d+/g, 'https://arcusx.one');
        
        // Asegurar que el redirect_uri en los query params también sea correcto
        const urlObj = new URL(finalUrl);
        const redirectUri = urlObj.searchParams.get('redirect_uri');
        if (redirectUri && redirectUri.includes('localhost')) {
          urlObj.searchParams.set('redirect_uri', redirectUrl);
          finalUrl = urlObj.toString();
        }
        
        console.log('URL corregida:', finalUrl);
        window.location.href = finalUrl;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async handleSupabaseCallback() {
    try {
      // Sincronizar usuario con backend PHP para obtener token JWT
      // La sesión ya fue obtenida en AuthCallback.tsx
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
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
    } catch (error) {
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
  }
}; 