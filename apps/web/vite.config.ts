import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = process.env.API_URL ?? 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/ws': { target: API.replace(/^http/, 'ws'), ws: true },
    },
  },
})
