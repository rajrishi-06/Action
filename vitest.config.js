import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Playwright owns e2e/; vitest must not try to collect those specs.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.js', 'src/context/**/*.jsx'],
    },
  },
});
