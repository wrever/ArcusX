import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

/**
 * Proxy evita CORS en el browser mientras api.arcusx.pro
 * no permita el header x-arcusx-network en preflight.
 * El SDK en DEV usa baseUrl = /partner-api → este proxy.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    open: true,
    proxy: {
      '/partner-api': {
        target: 'https://api.arcusx.pro',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/partner-api/, ''),
      },
    },
  },
});
