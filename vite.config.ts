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
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // This allows the PWA to be tested in dev mode (npm run dev)
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
            src: '/icons.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
