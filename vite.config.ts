import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RemeshThreeJS',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'remesh-threejs.js';
        if (format === 'cjs') return 'remesh-threejs.cjs';
        return `remesh-threejs.${format}.js`;
      },
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
