import { defineConfig } from 'tsup'
import { copyFileSync } from 'fs'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@gantt-pro/core'],
  loader: { '.css': 'copy' },
  onSuccess: () => {
    try {
      copyFileSync('src/gantt.css', 'dist/gantt.css')
      console.log('✅ gantt.css copied to dist/')
    } catch (e) {
      console.warn('⚠️  Failed to copy gantt.css:', e)
    }
  }
})
