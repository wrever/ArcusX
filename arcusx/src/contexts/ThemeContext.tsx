import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
import { isEnterpriseLandingHost } from '../config/enterpriseSite';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Empresas (subdominio): localStorage propio del origen; por defecto modo claro. Público: oscuro.
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('arcusx-theme') as Theme | null;
    if (typeof window !== 'undefined' && isEnterpriseLandingHost()) {
      return savedTheme || 'light';
    }
    return savedTheme || 'dark';
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isEnterpriseLandingHost()) {
      root.setAttribute('data-app-variant', 'enterprise');
    } else {
      root.removeAttribute('data-app-variant');
    }
  }, []);

  // Aplicar tema al documento
  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = isEnterpriseLandingHost() ? 'light' : theme;
    if (isEnterpriseLandingHost() && theme !== 'light') {
      setThemeState('light');
    }
    root.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('arcusx-theme', resolvedTheme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

