import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // During local development, forward /api/* requests to Vercel dev server.
      // Run `vercel dev` (port 3000) alongside `npm run dev` (port 5173).
      //
      // If you are NOT running `vercel dev`, start it first:
      //   npx vercel dev --listen 3000
      //
      // This proxy ensures the GEMINI_API_KEY (a server-only env var) is never
      // present in the Vite bundle — only the Vercel dev server reads .env.local.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
