import { test, expect, type Page } from '@playwright/test';
import { goals, lineOf, mouseDrag, tasks, touchDrag, write } from './helpers';

const oldTasks = (page: Page) => page.getByRole('textbox', { name: 'Old task', exact: true });

// Write Monday's list, then open the app on Tuesday. setFixedTime fakes only the clock, so drag timers still run.
async function leaveMonday(page: Page, lines: string[]) {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 9, 0));
  await page.goto('/');
  await write(page, lines);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 9, 0));
  await page.reload();
}

test('desktop: old lines move to today and the week, then the done page is binned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await leaveMonday(page, ['call bank', 'email Sam', 'book flights']);
  await expect(tasks(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mon · 3', exact: true })).toBeVisible();

  await mouseDrag(page, lineOf(oldTasks(page).nth(0)), page.locator('main'));
  await expect(tasks(page)).toHaveCount(1);
  await expect(tasks(page).nth(0)).toHaveValue('call bank');

  await mouseDrag(page, lineOf(oldTasks(page).nth(0)), lineOf(page.getByRole('textbox', { name: 'New goal', exact: true })));
  await expect(goals(page).nth(0)).toHaveValue('email Sam');
  await expect(oldTasks(page)).toHaveCount(1);
  await page.screenshot({ path: 'e2e/screenshots/desktop-pages.png', animations: 'disabled' });

  // Cross off the last line with a pen stroke.
  const box = (await lineOf(oldTasks(page).nth(0)).boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Mon · done', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Bin page', exact: true }).click();
  await expect(oldTasks(page)).toHaveCount(0);
  await page.reload();
  await expect(oldTasks(page)).toHaveCount(0);
  await expect(tasks(page)).toHaveCount(1);
  await expect(goals(page)).toHaveCount(1);
});

test('phone: the week tab counts old pages, and an old line long-presses onto today', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch drag');
  await leaveMonday(page, ['call bank', 'email Sam']);

  const tab = page.getByRole('button', { name: 'Week · 0 · 1 old', exact: true });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(oldTasks(page)).toHaveCount(2);
  await page.screenshot({ path: 'e2e/screenshots/phone-pages.png', animations: 'disabled' });

  await touchDrag(page, lineOf(oldTasks(page).nth(0)), page.getByRole('heading', { level: 1 }));
  await expect(tasks(page)).toHaveCount(1);
  await expect(tasks(page).nth(0)).toHaveValue('call bank');
  await expect(oldTasks(page)).toHaveCount(1);
});
