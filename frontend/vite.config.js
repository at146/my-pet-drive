import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  envDir: '../',
  build: {
    rollupOptions: {
      input: {
        drive: resolve(__dirname, 'drive.html'),
        route: resolve(__dirname, 'route.html'),
        order: resolve(__dirname, 'order.html')
      }
    }
  },
  server: {
    allowedHosts: ['equal-tick-mutually.ngrok-free.app'],
    hmr: false,
    // watch: {
    //   persistent: false,
    //   usePolling: false
    // },
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //     secure: false
    //   }
    // }
  }
})
