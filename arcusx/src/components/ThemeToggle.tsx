import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import '../css/ThemeToggle.css';

type Props = {
  /** Optional: show/hide outside */
  visible?: boolean;
  /** Optional: variant for different contexts */
  variant?: 'fab' | 'inline';
};

const ThemeToggle: React.FC<Props> = ({ visible = true, variant = 'fab' }) => {
  const { theme, toggleTheme } = useTheme();

  if (!visible) return null;

  return (
    <button
      className={`theme-toggle ${variant === 'inline' ? 'theme-toggle-inline' : ''}`}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      <div className="theme-toggle-icon-wrapper">
        {theme === 'dark' ? (
          <FaSun className="theme-toggle-icon sun-icon" />
        ) : (
          <FaMoon className="theme-toggle-icon moon-icon" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;

