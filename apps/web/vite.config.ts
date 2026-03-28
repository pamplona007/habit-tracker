import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Casa - Build better habits together',
        short_name: 'Casa',
        description: 'Casa - Build better habits together',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#016a6b',
        orientation: 'portrait',
        scope: '/',
        icons: [
          { src: '/icons-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
