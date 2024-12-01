import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative paths in production
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});