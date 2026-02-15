import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Increases the limit to 10 MiB to prevent precache failures
        maximumFileSizeToCacheInBytes: 10485760,
      },
      manifest: {
        name: 'KSF Inventory Manager',
        short_name: 'KSF Stock',
        description: 'Inventory Management for KSF Non-Woven Fabric',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Updated to use the Function format to satisfy Rolldown/Vite requirements
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'utils';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})