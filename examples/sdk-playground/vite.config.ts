import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

/** Proxy evita CORS browser↔gateway (header x-arcusx-network). */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
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
