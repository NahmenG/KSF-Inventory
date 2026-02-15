import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 10485760, // Increased to 10MB to be safe
      },
      manifest: {
        name: 'KSF Inventory Manager',
        short_name: 'KSF Stock',
        description: 'Inventory Management for KSF Non-Woven Fabric',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000, // Silences the 500kb warning
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
          utils: ['jspdf', 'html2canvas', 'xlsx']
        }
      }
    }
  }
})