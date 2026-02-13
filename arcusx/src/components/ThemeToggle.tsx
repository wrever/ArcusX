import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n/I18nProvider';
import '../css/ThemeToggle.css';

type Props = {
  /** Optional: show/hide outside */
  visible?: boolean;
  /** Optional: variant for different contexts */
  variant?: 'fab' | 'inline';
};

const ThemeToggle: React.FC<Props> = ({ visible = true, variant = 'fab' }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  if (!visible) return null;

  return (
    <button
      className={`theme-toggle ${variant === 'inline' ? 'theme-toggle-inline' : ''}`}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('theme.toggle.light') : t('theme.toggle.dark')}
      title={theme === 'dark' ? t('theme.toggle.light') : t('theme.toggle.dark')}
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

