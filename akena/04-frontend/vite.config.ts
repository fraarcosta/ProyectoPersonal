import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      // Proxy /api/orchestrator/* → Akena Orchestrator (FastAPI :8080)
      '/api/orchestrator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/orchestrator/, ''),
      },
      // Proxy /api/cualificacion/* → Agent Cualificacion (FastAPI :8084)
      '/api/cualificacion': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cualificacion/, ''),
      },
      // Proxy /api/pliego/* → Agent Pliego (FastAPI :8086)
      '/api/pliego': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pliego/, ''),
      },
      // Proxy /api/oferta/* → Agent Oferta (FastAPI :8087)
      '/api/oferta': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/oferta/, ''),
      },
      // Proxy /api/economico/* → Agent Económico (FastAPI :8088)
      '/api/economico': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/economico/, ''),
      },
    },
  },
})