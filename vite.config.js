import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 允许外部访问（局域网访问）
    host: '0.0.0.0',
    // 端口
    port: 5173,
    // 自动打开浏览器（可选）
    open: false,
    proxy: {
      '/api': {
        target: 'https://api.dify.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
      },
      '/minimax-api': {
        target: 'https://api.minimax.chat',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/minimax-api/, ''),
      }
    }
  }
})