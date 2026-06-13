import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry:    path.resolve(__dirname, 'src/index.ts'),
      name:     'Orlix',
      fileName: 'orlix',
      formats:  ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['fs', 'path', 'os', 'events', 'readline', 'crypto'],
    },
    sourcemap: true,
    minify:    false,
  },
});
