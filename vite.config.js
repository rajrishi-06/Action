import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Surface a genuine regression rather than normalising a warning we always see.
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        /**
         * Split long-lived dependencies into their own chunks. They change far
         * less often than app code, so a deploy invalidates only the small
         * application bundle instead of forcing every user to re-download React,
         * Supabase and the animation library.
         */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'vendor-dates': ['date-fns'],
        },
      },
    },
  },
  server: { port: 5173, open: false },
  preview: { port: 4173 },
});
