import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gantt-pro/core': resolve(__dirname, '../core/src/index.ts'),
      '@gantt-pro/react': resolve(__dirname, 'src/index.ts'),
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  }
})
