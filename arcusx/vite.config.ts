import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

// Plugin para copiar .htaccess al build
// NOTA: El .htaccess consolidado está en backend_externo/ y debe moverse manualmente a public_html/
const copyHtaccess = () => {
  return {
    name: 'copy-htaccess',
    closeBundle() {
      try {
        // Buscar .htaccess en backend_externo (donde está el consolidado)
        const backendHtaccess = join(__dirname, '..', 'backend_externo', '.htaccess')
        const dest = join(__dirname, 'dist', '.htaccess')
        
        // Si existe en backend_externo, copiarlo
        if (existsSync(backendHtaccess)) {
          copyFileSync(backendHtaccess, dest)
          console.log('✅ .htaccess copiado desde backend_externo/ a dist/')
        } else {
          // Crear .htaccess básico si no existe
          const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_URI} !^/api/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`
          writeFileSync(dest, htaccessContent)
          console.log('✅ .htaccess básico creado en dist/')
        }
      } catch (error: any) {
        console.error('❌ Error al copiar .htaccess:', error.message)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyHtaccess()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@creit.tech/stellar-wallets-kit']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
