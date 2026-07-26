import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  server: {
    // In production the API serves this bundle from its own origin, so /api is already local.
    // The proxy exists so development matches that shape — without it the dev build would be the
    // only place cross-origin cookies matter, and it would need CORS that production does not.
    proxy: {
      '/api': {
        target: 'http://localhost:5170',
        changeOrigin: false,
      },
    },
  },

  build: {
    // The API serves this directly out of its wwwroot.
    outDir: '../api/CvMakerPro.Api/wwwroot',
    emptyOutDir: true,
  },
});
