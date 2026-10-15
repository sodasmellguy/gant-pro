import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@gantt-pro/react/style.css', replacement: resolve(__dirname, '../../packages/react/src/gantt.css') },
      { find: '@gantt-pro/core', replacement: resolve(__dirname, '../../packages/core/src/index.ts') },
      { find: '@gantt-pro/react', replacement: resolve(__dirname, '../../packages/react/src/index.ts') },
    ]
  },
  server: { port: 5174 }
})
