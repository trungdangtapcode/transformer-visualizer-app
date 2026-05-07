import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svelte(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src/svelte"),
      // Shim: tailwindcss/resolveConfig → our shim (Tailwind 4 doesn't export this)
      "tailwindcss/resolveConfig": path.resolve(__dirname, "./src/svelte/resolveConfig.ts"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "${path.resolve(__dirname, './src/svelte/styles/variables.scss').replace(/\\/g, '/')}" as *;\n`,
        api: 'modern-compiler',
      },
    },
  },
  server: {
    proxy: {
      // Use /api/visualize specifically — NOT /api broadly.
      // HuggingFace CDN redirects tokenizer fetches to /api/resolve-cache/...
      // A broad /api proxy would intercept those redirects and break @xenova/transformers.
      '/api/visualize': {
        target: 'http://localhost:8000',
        rewrite: (p) => p.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
