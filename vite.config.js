import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qrcode } from 'vite-plugin-qrcode'

export default defineConfig({
  plugins: [
    react(),
    // 二维码插件：启动时显示二维码，手机扫码即可访问
    qrcode({
      // 显示二维码的位置：终端输出
      showInTerminal: true,
      // 二维码大小
      size: 200,
    }),
  ],
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