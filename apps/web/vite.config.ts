import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      injectRegister: 'inline',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Casa - Build better habits together',
        short_name: 'Casa',
        description: 'Casa - Build better habits together',
        id: 'casa-habit-tracker',
        start_url: '/',
        display: 'standalone',
        display_override: ['standalone'],
        background_color: '#ffffff',
        theme_color: '#016a6b',
        orientation: 'portrait',
        scope: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'lifestyle'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Tasks',
            short_name: 'Tasks',
            description: 'View and complete tasks',
            url: '/?tab=tasks',
            icons: [{ src: '/icons-192.png', sizes: '192x192' }],
          },
          {
            name: 'Notices',
            short_name: 'Notices',
            description: 'View household notices',
            url: '/?tab=notices',
            icons: [{ src: '/icons-192.png', sizes: '192x192' }],
          },
          {
            name: 'Shopping',
            short_name: 'Shopping',
            description: 'View shopping lists',
            url: '/?tab=shopping',
            icons: [{ src: '/icons-192.png', sizes: '192x192' }],
          },
        ],
        launch_handler: {
          client_mode: 'navigate-existing',
        },
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
