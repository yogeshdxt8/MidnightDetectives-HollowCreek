import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/MidnightDetectives-HollowCreek/',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: {
    host: '0.0.0.0',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
