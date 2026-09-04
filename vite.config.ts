import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'dist/sw.js',
      },
      devOptions: {
        enabled: true, // This allows the PWA to be tested in dev mode (npm run dev)
        type: 'module', // required so the dev server can load sw.ts's imports correctly
      },
      manifest: {
        name: 'Curio',
        short_name: 'Curio',
        description: 'Your daily habit app themed like a field journal',
        theme_color: '#F6F4EF',
        background_color: '#F6F4EF',
        display: 'standalone',
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192 512x512 1024x1024',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})