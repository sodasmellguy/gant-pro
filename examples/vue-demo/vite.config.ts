import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@gantt-pro/vue/style.css', replacement: resolve(__dirname, '../../packages/vue/src/gantt.css') },
      { find: '@gantt-pro/core', replacement: resolve(__dirname, '../../packages/core/src/index.ts') },
      { find: '@gantt-pro/vue', replacement: resolve(__dirname, '../../packages/vue/src/index.ts') },
    ]
  },
  server: { port: 5173 }
})
