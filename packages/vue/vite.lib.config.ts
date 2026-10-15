import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// 库模式构建（npm run build → dist/）
// Vue SFC 需要 vite 构建，不能用 tsup
export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: 'src',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.test.ts', 'src/__snapshots__/**'],
      outDir: 'dist',
      rollupTypes: false,
      compilerOptions: {
        paths: {
          '@gantt-pro/core': ['../core/dist/index.d.ts']
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@gantt-pro/core': resolve(__dirname, '../core/src/index.ts')
    }
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GanttProVue',
      fileName: format => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['vue', '@gantt-pro/core'],
      output: {
        globals: { vue: 'Vue', '@gantt-pro/core': 'GanttProCore' },
        assetFileNames: 'gantt.[ext]',
        exports: 'named'
      }
    }
  }
})
