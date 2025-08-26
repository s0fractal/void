import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 8080,
    host: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  envPrefix: 'VITE_',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});