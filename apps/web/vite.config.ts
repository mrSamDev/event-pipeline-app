import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { Plugin } from 'vite'

function injectVersionPlugin(): Plugin {
  return {
    name: 'inject-version',
    transformIndexHtml(html) {
      const version = process.env.VITE_APP_VERSION || 'dev'
      return html.replace(
        '<body style="background-color: #000000">',
        `<body style="background-color: #000000" data-tag-id="${version}">`
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), injectVersionPlugin()],
  // Load env file from root directory
  envDir: path.resolve(__dirname, '../../'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'table-vendor': ['@tanstack/react-table'],
          'chart-vendor': ['recharts'],
          'auth-vendor': ['better-auth'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
