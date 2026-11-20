import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5173,
    // In development the API is reached through this proxy (VITE_API_BASE_URL=/api).
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['radix-ui', 'motion', 'cmdk', 'sonner'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
})
