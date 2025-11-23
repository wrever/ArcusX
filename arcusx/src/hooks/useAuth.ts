import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

interface User {
  id: number;
  username: string;
  email: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(() => {
    const authenticated = authService.isAuthenticated();
    const currentUser = authService.getUser();
    
    setIsAuthenticated(authenticated);
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();

    // Escuchar cambios en localStorage para actualizar el estado
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    // Escuchar eventos de almacenamiento (para cambios entre pestañas)
    window.addEventListener('storage', handleStorageChange);

    // Verificar autenticación periódicamente (cada 5 segundos)
    const interval = setInterval(() => {
      checkAuth();
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setIsAuthenticated(true);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    // Forzar actualización del estado
    checkAuth();
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  };
}; 