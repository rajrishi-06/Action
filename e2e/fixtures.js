import { test as base, expect } from '@playwright/test';

/**
 * A signed-in page backed by a stubbed Supabase.
 *
 * Lets the UI flows be tested deterministically and without credentials, so
 * this suite runs in CI on pull requests from forks. The live suite covers what
 * a stub cannot: real auth, real RLS, real persistence.
 */

const DAY = 86_400_000;
const now = Date.now();
const at = (days, hour = 9) =>
  new Date(new Date(now + days * DAY).setHours(hour, 0, 0, 0)).toISOString();

export const SESSION = {
  access_token: 'e2e-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(now / 1000) + 3600,
  refresh_token: 'e2e-refresh-token',
  user: {
    id: 'e2e-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e@example.com',
    app_metadata: {},
    user_metadata: { full_name: 'Test User' },
    created_at: new Date(now - 30 * DAY).toISOString(),
  },
};

export const seedRows = () => [
  {
    id: 'task-open', user_id: 'e2e-user', title: 'Review the migration PR', notes: '',
    is_completed: false, completed_at: null, status: 'today', priority: 'high',
    created_at: at(-2), updated_at: at(-2), due_date: at(0, 14), has_time: true,
    tags: ['work'], subtasks: [], estimate_minutes: 45, recurrence: null, position: 1000,
  },
  {
    id: 'task-backlog', user_id: 'e2e-user', title: 'Plan the Lisbon trip', notes: 'Flights first.',
    is_completed: false, completed_at: null, status: 'backlog', priority: 'low',
    created_at: at(-5), updated_at: at(-5), due_date: at(14), has_time: false,
    tags: ['personal'], subtasks: [], estimate_minutes: null, recurrence: null, position: 2000,
  },
  {
    id: 'task-done', user_id: 'e2e-user', title: 'Ship the onboarding fix', notes: '',
    is_completed: true, completed_at: at(0, 11), status: 'done', priority: 'medium',
    created_at: at(-3), updated_at: at(0, 11), due_date: at(0, 11), has_time: true,
    tags: ['work'], subtasks: [], estimate_minutes: 30, recurrence: null, position: 3000,
  },
];

/** `sb-<project-ref>-auth-token`, matching what supabase-js writes. */
export function authStorageKey(url = process.env.VITE_SUPABASE_URL) {
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return 'sb-localhost-auth-token';
  }
}

/**
 * Navigate and wait until the app is actually interactive.
 *
 * `page.goto` resolves on the load event, which is before React has mounted and
 * attached its window-level keyboard listeners. Pressing a key before then
 * silently does nothing, which looks exactly like a broken shortcut.
 */
export async function gotoApp(page, path) {
  await page.goto(path);
  // The main landmark is rendered by the app shell, so its presence means React
  // has mounted and the global hotkey listener is attached.
  await page.getByRole('main').waitFor({ state: 'visible' });
}

export const test = base.extend({
  /** A page already signed in, with a stubbed task table backing it. */
  appPage: async ({ page }, use) => {
    let rows = seedRows();

    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) }),
    );
    await page.route('**/realtime/**', (route) => route.abort());
    await page.route('**/fonts.googleapis.com/**', (route) => route.abort());

    // Registered first, deliberately: Playwright matches the most recently
    // added route, so this fallback must be shadowed by the specific one below.
    // Tables the app probes for but that need not exist (app_meta, user_stats)
    // answer with "relation does not exist", which the app handles.
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: '42P01', message: 'relation does not exist' }),
      }),
    );

    await page.route('**/rest/v1/tasks*', async (route) => {
      const request = route.request();
      const method = request.method();

      // `.single()` / `.maybeSingle()` ask PostgREST for a bare object rather
      // than an array. Honour that, or supabase-js returns a malformed row.
      const wantsObject = (request.headers().accept ?? '').includes('pgrst.object');
      const respond = (status, rows) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows),
        });

      if (method === 'GET') {
        return respond(200, rows);
      }

      if (method === 'POST') {
        const body = JSON.parse(request.postData() ?? '{}');
        const inserted = (Array.isArray(body) ? body : [body]).map((row) => ({
          ...row,
          id: row.id ?? `generated-${rows.length}`,
          created_at: row.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_completed: row.is_completed ?? false,
          completed_at: row.completed_at ?? null,
          tags: row.tags ?? [],
          subtasks: row.subtasks ?? [],
        }));
        rows = [...inserted, ...rows];
        return respond(201, inserted);
      }

      if (method === 'PATCH') {
        const patch = JSON.parse(request.postData() ?? '{}');
        const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
        rows = rows.map((row) =>
          row.id === id ? { ...row, ...patch, updated_at: new Date().toISOString() } : row,
        );
        return respond(200, rows.filter((row) => row.id === id));
      }

      if (method === 'DELETE') {
        const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
        rows = rows.filter((row) => row.id !== id);
        return route.fulfill({ status: 204, body: '' });
      }

      return respond(200, []);
    });

    // supabase-js stores the session under `sb-<project-ref>-auth-token`, where
    // the ref is the first label of the project hostname. Derive it from the
    // same URL the bundle was built with rather than hardcoding one project.
    await page.addInitScript(
      ({ session, storageKey }) => {
        localStorage.setItem(storageKey, JSON.stringify(session));
      },
      { session: SESSION, storageKey: authStorageKey() },
    );

    await use(page);
  },
});

export { expect };
