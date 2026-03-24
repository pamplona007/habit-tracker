import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/notices': 'http://localhost:3000',
      '/weekly-tasks': 'http://localhost:3000',
      '/monthly-tasks': 'http://localhost:3000',
      '/shopping': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
})
