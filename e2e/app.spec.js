import { expect, gotoApp, test } from './fixtures';

/** The task list only — task titles also appear in the insight cards above it. */
const taskList = (page) => page.getByRole('region', { name: 'Task list' });

/**
 * The completion toggle is a visually-hidden checkbox behind a styled span,
 * which is the right markup but is not directly clickable. Drive it through its
 * label, exactly as a sighted user does.
 */
const completionToggle = (page, title) =>
  taskList(page).getByLabel(`Mark "${title}" as done`);

/**
 * UI flows against a stubbed backend.
 *
 * Runs anywhere, including CI on pull requests from forks, because it needs no
 * credentials. What it cannot cover — real auth, RLS, actual persistence — is
 * in live.spec.js.
 */

test.describe('Task capture', () => {
  test('parses a natural-language task and saves the cleaned title', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');

    const input = page.getByRole('textbox', { name: 'New task' });
    await input.fill('Draft the release notes tomorrow 4pm #work !high');

    // The parse preview must show what will actually be stored. Scoped to the
    // preview row, since an existing task may carry a High badge of its own.
    const preview = page.getByText('Will be saved as').locator('xpath=..');
    await expect(preview.getByText('Draft the release notes', { exact: true })).toBeVisible();
    await expect(preview.getByText('High', { exact: true })).toBeVisible();

    await input.press('Enter');

    // The saved task carries the clean title, not the raw input.
    await expect(taskList(page).getByRole('button', { name: 'Draft the release notes', exact: true })).toBeVisible();
    await expect(page.getByText('tomorrow 4pm #work')).toHaveCount(0);
  });

  test('rejects an empty submission', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await expect(page.getByRole('button', { name: /^Add/ })).toBeDisabled();
  });
});

test.describe('Task lifecycle', () => {
  test('completing a task moves it out of the open list', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    // A plain click, not check(): completing the task removes the row from this
    // view, so the checkbox unmounts and check()'s post-assertion cannot pass.
    await completionToggle(page, 'Review the migration PR').click({ force: true });

    await expect(
      taskList(page).getByLabel('Mark "Review the migration PR" as not done'),
    ).toHaveCount(0);
  });

  test('deleting a task offers an undo that restores it', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    await page.getByRole('button', { name: 'Delete "Plan the Lisbon trip"' }).click();
    await expect(taskList(page).getByRole('button', { name: 'Plan the Lisbon trip', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(taskList(page).getByRole('button', { name: 'Plan the Lisbon trip', exact: true })).toBeVisible();
  });

  test('renaming inline persists the new title', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    await page.getByRole('button', { name: 'Rename "Plan the Lisbon trip"' }).click();
    const field = page.getByRole('textbox', { name: 'Task title' });
    await field.fill('Plan the Porto trip');
    await field.press('Enter');

    await expect(taskList(page).getByRole('button', { name: 'Plan the Porto trip', exact: true })).toBeVisible();
  });

  test('the detail dialog edits fields the list cannot', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    await taskList(page).getByRole('button', { name: 'Review the migration PR', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Priority').selectOption('urgent');
    await dialog.getByLabel('Notes').fill('Blocking the release.');
    await dialog.getByRole('button', { name: 'Done' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Blocking the release.')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('every view is a real URL that survives a reload', async ({ appPage: page }) => {
    for (const [path, heading] of [
      ['/app/today', 'Today'],
      ['/app/upcoming', 'Upcoming'],
      ['/app/board', 'Board'],
      ['/app/calendar', 'Calendar'],
      ['/app/focus', 'Focus'],
      ['/app/analytics', 'Insights'],
      ['/app/settings', 'Settings'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    }
  });

  test('the browser back button works', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await page.getByRole('link', { name: /Board/ }).click();
    await expect(page).toHaveURL(/\/app\/board/);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/today/);
  });

  test('an unknown path renders the 404 page', async ({ appPage: page }) => {
    await page.goto('/app/nonsense');
    await expect(page.getByText('This page does not exist')).toBeVisible();
  });
});

test.describe('Search and filtering', () => {
  test('search narrows the list', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    await page.getByRole('searchbox', { name: 'Search tasks' }).fill('Lisbon');

    await expect(taskList(page).getByRole('button', { name: 'Plan the Lisbon trip', exact: true })).toBeVisible();
    await expect(taskList(page).getByRole('button', { name: 'Review the migration PR', exact: true })).toHaveCount(0);
  });

  test('a search with no matches explains itself and offers a way back', async ({ appPage: page }) => {
    await gotoApp(page, '/app/all');

    await page.getByRole('searchbox', { name: 'Search tasks' }).fill('zzzzz');

    await expect(page.getByText('No tasks match those filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(taskList(page).getByRole('button', { name: 'Plan the Lisbon trip', exact: true })).toBeVisible();
  });
});

test.describe('Command palette', () => {
  test('searches tasks, not just commands', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await page.keyboard.press('ControlOrMeta+k');

    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();

    await page.keyboard.type('Lisbon');
    await expect(dialog.getByRole('option', { name: /Plan the Lisbon trip/ })).toBeVisible();
  });

  test('navigates to a view', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await page.keyboard.press('ControlOrMeta+k');
    await page.keyboard.type('insights');

    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('option', { name: /Go to Insights/ }).click();

    await expect(page).toHaveURL(/\/app\/analytics/);
  });

  test('closes on Escape', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });
});

test.describe('Theme', () => {
  test('the dark class is applied and survives a reload', async ({ appPage: page }) => {
    await gotoApp(page, '/app/settings');

    await page.getByRole('radio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    // The pre-paint script must restore it, or the page flashes the wrong theme.
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

test.describe('Accessibility', () => {
  test('a skip link is the first thing keyboard focus reaches', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');

    const skipLink = page.getByRole('link', { name: 'Skip to content' });

    // It must be the first thing in tab order...
    await expect(skipLink).toHaveCount(1);
    const isFirstTabbable = await page.evaluate(() => {
      const focusable = document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      return focusable[0]?.textContent?.trim();
    });
    expect(isFirstTabbable).toBe('Skip to content');

    // ...and must become visible once focused, or it is useless.
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
  });

  test('the shortcuts dialog opens with ? and traps focus', async ({ appPage: page }) => {
    await gotoApp(page, '/app/today');
    await page.keyboard.press('?');

    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Open the command palette')).toBeVisible();
  });
});
