import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // shared/contract.ts lives at the repo root (lead-owned). Types only.
      '@shared': path.resolve(import.meta.dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // Local API: npm run dev:api (server/ on port 3000).
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
})
