import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Load .env the way Vite does at build time.
 *
 * The fixtures need VITE_SUPABASE_URL to derive the session storage key
 * supabase-js uses (`sb-<project-ref>-auth-token`). Without it every test signs
 * in against the wrong key, lands on /login, and fails identically.
 */
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  /* no .env — placeholders below keep the stubbed suite working */
}

/**
 * The stubbed suite must run with no configuration at all.
 *
 * Vite inlines these at build time, and with neither set the app boots into its
 * setup screen — so every test would fail against a page that never renders the
 * app. Placeholders are enough: all Supabase traffic is intercepted, and the
 * fixtures derive the session storage key from whichever URL was used.
 */
process.env.VITE_SUPABASE_URL ??= 'https://e2e-placeholder.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'e2e-placeholder-key';

/**
 * End-to-end configuration.
 *
 * Two suites with different requirements:
 *  - `e2e/app.spec.js` stubs the backend, so it runs anywhere including CI
 *    without secrets.
 *  - `e2e/live.spec.js` needs a real Supabase project and skips itself when one
 *    is not configured. That is the suite that covers auth and RLS — the layer
 *    unit tests cannot reach.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Escape hatch for environments that ship a browser Playwright did not
        // install itself (sandboxes, locked-down CI images). Left unset, the
        // normal `npx playwright install` binary is used.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],

  // Reuse a running preview locally; start one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
