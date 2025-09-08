import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        // Use backend service name when running in Docker, localhost otherwise
        target: process.env.BACKEND_URL || 'http://backend:9000',
        changeOrigin: true,
      }
    },
    allowedHosts: ["middledude"],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
