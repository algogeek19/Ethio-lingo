import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      external: (id) => /^@mux\//.test(id) || /^@vimeo\//.test(id) || id.includes('hls.js') || id.includes('dashjs') || id.includes('flv.js'),
    },
    rollupOptions: {
      external: (id) => /^@mux\//.test(id) || /^@vimeo\//.test(id) || id.includes('hls.js') || id.includes('dashjs') || id.includes('flv.js'),
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
})
