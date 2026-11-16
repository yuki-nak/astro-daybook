import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  vite: {
    build: {
      // Emit even small scripts as files instead of inlining them into the HTML,
      // because the CSP in public/_headers (script-src 'self') forbids inline scripts.
      assetsInlineLimit: 0,
    },
  },
});
