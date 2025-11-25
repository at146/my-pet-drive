import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        drive: resolve(__dirname, 'drive.html')
      }
    }
  },
  server: {
    allowedHosts: ['equal-tick-mutually.ngrok-free.app']
  }
})
