# Versión Empresas (subdominio `empresas.*`)

## Comportamiento

- **Detección:** `isEnterpriseLandingHost()` en `src/config/enterpriseSite.ts` (hostname `empresas.*` o `VITE_ENTERPRISE_LANDING_HOST=true`).
- **Tema por defecto:** modo **claro** en el origen empresas (localStorage independiente del dominio principal).
- **Marca en HTML:** `document.documentElement` recibe `data-app-variant="enterprise"` para estilos globales futuros.

## Archivos clave

| Qué | Dónde |
|-----|--------|
| Hook reutilizable | `src/hooks/useEnterpriseMode.ts` |
| Tema + `data-app-variant` | `src/contexts/ThemeContext.tsx` |
| Login / registro + navbar empresas | `src/App.tsx` (rutas `/login`, `/register`) |
| Clases condicionales | `Login.tsx`, `Register.tsx`, `dashboard.tsx` |
| Estilos empresas | `src/css/Login.enterprise.css`, `Register.enterprise.css`, `dashboard.enterprise.css` |

## Misma lógica

No se duplican `useAuth`, servicios ni llamadas API: solo capas CSS y layout (navbar en auth).

## Ampliar el look “empresas” a otras pantallas

1. Importar `useEnterpriseMode()` en el componente.
2. Añadir una clase raíz, p. ej. `create-task--enterprise`.
3. Crear `CreateTask.enterprise.css` con overrides bajo esa clase.
4. Añadir el nombre de clase al `safelist` de PurgeCSS en `vite.config.ts` si aplica.
