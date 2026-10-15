import crypto from 'node:crypto';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// A Content-Security-Policy for the built app. The sign-in token lives in
// localStorage, so this limits what an injected script could do with it:
// scripts only from this site (plus the theme script in index.html, allowed by
// its hash), and connections only to this site and the API. Build only:
// the dev server needs inline scripts of its own.
function contentSecurityPolicy(apiUrl) {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
          .map(([, code]) => `'sha256-${crypto.createHash('sha256').update(code).digest('base64')}'`);
        const api = apiUrl ? ` ${new URL(apiUrl).origin}` : '';
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${inline.join(' ')}`,
          "style-src 'self'",
          "img-src 'self' data:",
          "font-src 'self'",
          `connect-src 'self'${api}`,
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ');
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Where the app is served from. '/' locally; the GitHub Pages build sets
  // BASE_PATH=/Healing-Hive/ because Pages serves the repo under that path.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), contentSecurityPolicy(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_URL)],
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
}));
