import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // On GitHub Pages the app lives at /repo-name/; locally it's /.
  base: process.env.VITE_BASE_PATH ?? '/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Weather Notifier',
        short_name: 'Weather',
        description: 'Personal weather app with customizable push notification triggers',
        // Relative start_url so it works under any sub-path (GitHub Pages or root)
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        // Paths without leading / so they resolve relative to the manifest file.
        // The manifest is emitted next to index.html, so the sub-path is correct
        // on both localhost and GitHub Pages.
        icons: [
          { src: 'icons/pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'icons/pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
