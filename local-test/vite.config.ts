import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

/**
 * Proxy local → Edge arcusx-api (Testnet).
 * Inyecta apikey anon como el gateway de producción (api.arcusx.pro),
 * para que el browser solo mande Authorization: Bearer axk_…
 *
 * Evita SSL/CORS de api.arcusx.pro en máquinas con reloj o cert rota.
 * Override: ARCUSX_EDGE_ORIGIN / SUPABASE_ANON_KEY en local-test/.env
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const edgeOrigin = (
    env.ARCUSX_EDGE_ORIGIN ||
    'https://atgsesbstjleabesclzs.supabase.co/functions/v1/arcusx-api'
  ).replace(/\/$/, '');
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    server: {
      port: 5200,
      open: true,
      proxy: {
        '/partner-api': {
          target: edgeOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/partner-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (anonKey) {
                proxyReq.setHeader('apikey', anonKey);
              }
              const auth = String(req.headers.authorization || '');
              const m = auth.match(/Bearer\s+(axk_(?:test|live)_[A-Za-z0-9_-]+)/i);
              if (m) {
                proxyReq.setHeader('x-arcusx-api-key', m[1]);
              }
              // Edge auth partner lee Bearer axk_ o x-arcusx-api-key; no hace falta JWT
            });
          },
        },
      },
    },
  };
});
