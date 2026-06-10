import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './css/themes.css'
import './css/auth-surfaces-light.css'
import './css/light-theme-global.css'
import './css/light-theme-remaining.css'
import './css/light-theme-contrast.css'
import './css/theme-legacy-bridge.css'
import './css/semantic-alerts.css'
import './css/responsive-critical.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18nProvider'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <HelmetProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>,
)
