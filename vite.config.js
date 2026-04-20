// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],

  // ── FIX Worker E2EE LiveKit ──────────────────────────────────────────────
  // Sans ces deux options, Vite ne résout pas correctement
  // `new Worker(new URL('livekit-client/e2ee-worker', import.meta.url))` :
  // le fichier worker n'est pas émis dans le build → le serveur retourne
  // index.html pour cette URL → le navigateur rejette avec
  // "MIME type text/html, expected JavaScript module".
  optimizeDeps: {
    exclude: ['livekit-client'],   // ne pas pré-bundler LiveKit (il gère ses propres workers)
  },
  worker: {
    format: 'es',                  // workers en ES modules — requis par livekit-client e2ee-worker
  },

  server: {
  https: {
    key: fs.readFileSync('certificats/localhost-key.pem'),
    cert: fs.readFileSync('certificats/localhost.pem'),
  },
  port: 5173,
  host: true,

  proxy: {
    '/api': {
      target: 'https://api.reunioncrypto.rtn.sn',
      changeOrigin: true,
      secure: false,           // désactive la vérification du certificat du backend
      rewrite: (path) => path.replace(/^\/api/, '/api'), // garde /api (ton backend l’attend)
      
      // Options supplémentaires pour éviter les erreurs TLS / ECONNRESET
      configure: (proxy, _options) => {
        proxy.on('error', (err, _req, _res) => {
          console.log('Proxy error:', err);
        });
        proxy.on('proxyReq', (proxyReq, req, _res) => {
          console.log(`[Proxy] ${req.method} ${req.url} → ${proxyReq.path}`);
        });
      },
    },
  },
},
})