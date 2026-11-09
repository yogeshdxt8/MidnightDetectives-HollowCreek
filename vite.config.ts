import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) {
            return 'three-vendor';
          }

          if (id.includes('/node_modules/')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
