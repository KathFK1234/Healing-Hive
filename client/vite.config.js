import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // In development the API is reached through the same origin as the app,
    // so there is nothing to configure and no CORS to think about.
    proxy: {
      '/api': 'http://localhost:7002',
    },
  },
});
