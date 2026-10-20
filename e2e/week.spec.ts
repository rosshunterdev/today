import { test, expect } from '@playwright/test';
import { goals, lineOf, mouseDrag, tasks, touchDrag, write } from './helpers';

test('desktop: reorder today, then move a task into the week note and back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await page.goto('/');
  await write(page, ['groceries', 'work on assignment', 'reply to Sam']);

  // Reorder still works after the drag context moved up.
  await mouseDrag(page, lineOf(tasks(page).nth(2)), lineOf(tasks(page).nth(0)));
  await expect(tasks(page).nth(0)).toHaveValue('reply to Sam');

  await mouseDrag(page, lineOf(tasks(page).nth(2)), lineOf(page.getByRole('textbox', { name: 'New goal', exact: true })));
  await expect(goals(page)).toHaveCount(1);
  await expect(goals(page).nth(0)).toHaveValue('work on assignment');
  await expect(tasks(page)).toHaveCount(2);
  await page.screenshot({ path: 'e2e/screenshots/desktop-week.png', animations: 'disabled' });

  await mouseDrag(page, lineOf(goals(page).nth(0)), lineOf(tasks(page).nth(1)));
  await expect(goals(page)).toHaveCount(0);
  await expect(tasks(page)).toHaveCount(3);
  await expect(tasks(page).nth(1)).toHaveValue('work on assignment');

  await page.reload();
  await expect(tasks(page).nth(1)).toHaveValue('work on assignment');
});

test('phone: long-press a task onto the corner, then drop the goal on back to today', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch drag');
  await page.goto('/');
  await write(page, ['groceries', 'work on assignment']);
  await page.getByRole('heading', { level: 1 }).click(); // leave the line so the keyboard bar goes

  const corner = page.getByRole('button', { name: 'this week', exact: true });
  await touchDrag(page, lineOf(tasks(page).nth(1)), corner);
  await expect(tasks(page)).toHaveCount(1);

  await corner.click();
  await expect(goals(page).nth(0)).toHaveValue('work on assignment');
  await page.screenshot({ path: 'e2e/screenshots/phone-week.png', animations: 'disabled' });

  const back = page.getByRole('button', { name: 'back to today', exact: true });
  await touchDrag(page, lineOf(goals(page).nth(0)), back);
  await expect(goals(page)).toHaveCount(0);

  await back.click();
  await expect(tasks(page)).toHaveCount(2);
  await expect(tasks(page).nth(1)).toHaveValue('work on assignment');
});

test('desktop: a goal dropped on blank paper moves to the end of today', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await page.goto('/');
  await write(page, ['groceries']);
  await page.getByRole('textbox', { name: 'New goal', exact: true }).click();
  await page.keyboard.type('work on assignment');
  await page.keyboard.press('Enter');
  await expect(goals(page)).toHaveCount(1);

  // The middle of the page is empty lined paper, well below the only task.
  await mouseDrag(page, lineOf(goals(page).nth(0)), page.locator('main'));
  await expect(goals(page)).toHaveCount(0);
  await expect(tasks(page)).toHaveCount(2);
  await expect(tasks(page).nth(1)).toHaveValue('work on assignment');
});
