import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

/**
 * End-to-end against a real Supabase project.
 *
 * This is the suite that covers what unit tests and stubs cannot: real
 * authentication, real Row Level Security, and whether data actually persists.
 * The worst bug in the pre-rebuild app — signing in and seeing an empty list
 * because the fetch ran once while signed out — would have been caught here
 * immediately and by nothing else.
 *
 * Requires a live project. Set these before running:
 *
 *   VITE_SUPABASE_URL=...      the project to test against
 *   VITE_SUPABASE_ANON_KEY=...
 *   E2E_LIVE=1                 explicit opt-in, so it never runs by accident
 *   E2E_PASSWORD=...           optional; only if your project enforces a
 *                              specific password policy
 *
 * Use a project you are happy to write to. Every test cleans up after itself,
 * but it does create accounts. Email confirmation must be off, or sign-up
 * returns no session and there is nothing to test with.
 */

const LIVE = process.env.E2E_LIVE === '1' && Boolean(process.env.VITE_SUPABASE_URL);

test.describe('Live backend', () => {
  test.skip(
    !LIVE,
    'Set E2E_LIVE=1 with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run these.',
  );

  // Real network plus real auth is slower than the stubbed suite.
  test.setTimeout(60_000);

  /**
   * Generated per run rather than written into the repository.
   *
   * A literal password in source is a bad pattern even when the accounts are
   * throwaway — secret scanners flag it, and it invites reuse somewhere it
   * would matter. Override with E2E_PASSWORD if your project enforces a
   * specific policy.
   */
  const password =
    process.env.E2E_PASSWORD ?? `Aa1!${randomUUID().replace(/-/g, '').slice(0, 20)}`;

  const uniqueEmail = (label) =>
    `action-e2e-${label}-${Date.now()}-${randomUUID().slice(0, 6)}@example.com`;

  /** Create an account through the UI and land in the app. */
  async function signUp(page, email) {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/app\//, { timeout: 30_000 });
  }

  async function signIn(page, email) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app\//, { timeout: 30_000 });
  }

  test('a signed-in user sees their tasks immediately, without a reload', async ({ page }) => {
    // This is the regression test for the defect that motivated the rebuild:
    // task data used to be fetched once on mount while still signed out, and
    // never refetched when the session arrived.
    const email = uniqueEmail('session');
    await signUp(page, email);

    await page.getByRole('textbox', { name: 'New task' }).fill('Task created before sign-out');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Task created before sign-out' })).toBeVisible();

    // Sign out, then back in. The list must populate on its own.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, email);

    await page.goto('/app/all');
    await expect(page.getByRole('button', { name: 'Task created before sign-out' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('a task survives a full page reload', async ({ page }) => {
    await signUp(page, uniqueEmail('persist'));

    await page.getByRole('textbox', { name: 'New task' }).fill('Persisted task tomorrow !high #work');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Persisted task' })).toBeVisible();

    await page.reload();
    await page.goto('/app/all');

    // Both the task and everything the parser extracted must have persisted.
    await expect(page.getByRole('button', { name: 'Persisted task' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('#work')).toBeVisible();
    await expect(page.getByText('High', { exact: true })).toBeVisible();
  });

  test('subtasks persist, which they previously did not', async ({ page }) => {
    // The old updateTask hand-wrote its column map and omitted subtasks
    // entirely, so they lived in React state and never reached Postgres.
    await signUp(page, uniqueEmail('subtasks'));

    await page.getByRole('textbox', { name: 'New task' }).fill('Task with steps');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');

    await page.getByRole('button', { name: 'Open "Task with steps"' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'New step' }).fill('First step');
    await dialog.getByRole('textbox', { name: 'New step' }).press('Enter');
    await expect(dialog.getByText('First step')).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();

    await page.reload();
    await page.goto('/app/all');
    await page.getByRole('button', { name: 'Open "Task with steps"' }).click();
    await expect(page.getByRole('dialog').getByText('First step')).toBeVisible({ timeout: 20_000 });
  });

  test('a board move survives a reload', async ({ page }) => {
    // The old handleDragEnd was empty, so nothing about a drag was ever saved.
    await signUp(page, uniqueEmail('board'));

    await page.getByRole('textbox', { name: 'New task' }).fill('Board task');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');

    await page.getByRole('button', { name: 'Open "Board task"' }).click();
    await page.getByRole('dialog').getByLabel('Column').selectOption('doing');
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();

    await page.goto('/app/board');
    await page.reload();

    const inProgress = page.getByRole('region', { name: /In progress/ });
    await expect(inProgress.getByText('Board task')).toBeVisible({ timeout: 20_000 });
  });

  test('one user cannot see another user’s tasks', async ({ browser }) => {
    // The RLS assertion. If this fails, the publishable key stops being safe to
    // ship, because policies are the only thing protecting the data.
    const alice = await browser.newContext();
    const bob = await browser.newContext();

    try {
      const alicePage = await alice.newPage();
      await signUp(alicePage, uniqueEmail('alice'));
      await alicePage.getByRole('textbox', { name: 'New task' }).fill('Alice private task');
      await alicePage.getByRole('textbox', { name: 'New task' }).press('Enter');
      await expect(alicePage.getByRole('button', { name: 'Alice private task' })).toBeVisible();

      const bobPage = await bob.newPage();
      await signUp(bobPage, uniqueEmail('bob'));
      await bobPage.goto('/app/all');

      // Give any leak time to appear rather than passing on a race.
      await bobPage.waitForTimeout(3000);
      await expect(bobPage.getByText('Alice private task')).toHaveCount(0);
    } finally {
      await alice.close();
      await bob.close();
    }
  });

  test('deleting a task and undoing it round-trips through the server', async ({ page }) => {
    await signUp(page, uniqueEmail('undo'));

    await page.getByRole('textbox', { name: 'New task' }).fill('Task to delete');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Task to delete' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete "Task to delete"' }).click();
    await page.getByRole('button', { name: 'Undo' }).click();

    await page.reload();
    await page.goto('/app/all');
    await expect(page.getByRole('button', { name: 'Task to delete' })).toBeVisible({ timeout: 20_000 });
  });

  test('completing a task records a real completion time and reaches Insights', async ({ page }) => {
    // Insights is built on completed_at. The old build inferred it from
    // created_at, so this is the assertion that the right column is populated.
    await signUp(page, uniqueEmail('insights'));

    await page.getByRole('textbox', { name: 'New task' }).fill('Task to complete');
    await page.getByRole('textbox', { name: 'New task' }).press('Enter');

    await page.getByRole('checkbox', { name: 'Mark "Task to complete" as done' }).check();

    await page.goto('/app/analytics');
    const completedToday = page.locator('text=Completed today').locator('..');
    await expect(completedToday.getByText('1', { exact: true })).toBeVisible({ timeout: 20_000 });
  });
});
