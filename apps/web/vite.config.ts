import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5318,
    strictPort: true,
    proxy: {
      // The API refuses mutations whose Origin differs from its Host. In development the
      // browser's origin is this dev server, so the proxy drops the header it would reject.
      '/api': {
        target: 'http://127.0.0.1:4317',
        changeOrigin: true,
        configure: (proxy) => proxy.on('proxyReq', (proxyRequest) => proxyRequest.removeHeader('origin')),
      },
    },
  },
})
