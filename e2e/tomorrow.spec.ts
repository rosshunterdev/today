import { test, expect, type Page } from '@playwright/test';
import { goals, lineOf, mouseDrag, tasks, write } from './helpers';

const tomorrowTasks = (page: Page) => page.getByRole('textbox', { name: 'Tomorrow task', exact: true });
const toggle = (page: Page) => page.getByRole('button', { name: 'Tomorrow', exact: true });

test('a line written in Tomorrow on Thursday evening is on Friday’s page', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(2026, 9, 22, 21, 0));
  await page.goto('/');
  await write(page, ['groceries']);
  await toggle(page).click();
  await expect(page.getByRole('textbox', { name: 'New tomorrow task', exact: true })).toBeFocused();
  await page.keyboard.type('reply to Sam');
  await page.keyboard.press('Enter');
  // Wait until the line is saved, or the reload can land before the write.
  await expect(tomorrowTasks(page)).toHaveCount(1);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-tomorrow.png`, animations: 'disabled' });

  await page.clock.setFixedTime(new Date(2026, 9, 23, 4, 1));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Friday');
  await expect(tasks(page)).toHaveCount(1);
  await expect(tasks(page).nth(0)).toHaveValue('reply to Sam');
  await expect(tomorrowTasks(page)).toHaveCount(0);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-tomorrow-folded.png`, animations: 'disabled' });
});

test('desktop: lines drag into Tomorrow from today and the week, and back to today', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await page.clock.setFixedTime(new Date(2026, 9, 22, 21, 0));
  await page.goto('/');
  await write(page, ['reply to Sam', 'groceries']);
  await expect(tasks(page)).toHaveCount(2);

  // Onto the folded header: the line moves, and Tomorrow opens with no fold control left.
  await mouseDrag(page, lineOf(tasks(page).nth(0)), toggle(page));
  await expect(tomorrowTasks(page)).toHaveCount(1);
  await expect(tomorrowTasks(page).nth(0)).toHaveValue('reply to Sam');
  await expect(tasks(page)).toHaveCount(1);
  await expect(toggle(page)).toHaveCount(0);

  // A goal dropped on Tomorrow's line lands in front of it.
  await page.getByRole('textbox', { name: 'New goal', exact: true }).click();
  await page.keyboard.type('apply to the job');
  await page.keyboard.press('Enter');
  await expect(goals(page)).toHaveCount(1);
  await mouseDrag(page, lineOf(goals(page).nth(0)), lineOf(tomorrowTasks(page).nth(0)));
  await expect(goals(page)).toHaveCount(0);
  await expect(tomorrowTasks(page)).toHaveCount(2);
  await expect(tomorrowTasks(page).nth(0)).toHaveValue('apply to the job');
  await page.screenshot({ path: 'e2e/screenshots/desktop-tomorrow-drag.png', animations: 'disabled' });

  // A Tomorrow line dropped on today's line goes back to today, in front of it.
  await mouseDrag(page, lineOf(tomorrowTasks(page).nth(1)), lineOf(tasks(page).nth(0)));
  await expect(tomorrowTasks(page)).toHaveCount(1);
  await expect(tasks(page)).toHaveCount(2);
  await expect(tasks(page).nth(0)).toHaveValue('reply to Sam');

  await page.getByRole('button', { name: 'Night pages', exact: true }).click();
  await page.screenshot({ path: 'e2e/screenshots/desktop-tomorrow-night.png', animations: 'disabled' });
});
