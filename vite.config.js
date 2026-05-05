import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'WeatherPWA',
        short_name: 'Weather',
        description: 'Personal weather app with customizable push notification triggers',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icons/pwa-64x64.png',              sizes: '64x64',   type: 'image/png' },
          { src: '/icons/pwa-192x192.png',             sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png',             sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-icon-512x512.png',   sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
