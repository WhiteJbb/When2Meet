import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  base: process.env.NODE_ENV === 'production'
    ? (process.env.VITE_BASE_URL || '/')
    : '/',
})
