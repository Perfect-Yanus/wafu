/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    assetsInlineLimit: 4096,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
