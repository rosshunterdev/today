import { test, expect, type Page } from '@playwright/test';
import { goals, lineOf, mouseDrag, tasks, write } from './helpers';

const tomorrowTasks = (page: Page) => page.getByRole('textbox', { name: 'Tomorrow task', exact: true });
const toggle = (page: Page) => page.getByRole('button', { name: 'Tomorrow', exact: true });
const tomorrowValues = (page: Page) => tomorrowTasks(page).evaluateAll((lines) => lines.map((line) => (line as HTMLInputElement).value));

// Where the word "Tomorrow" starts in its heading, whether it sits in the fold button or not.
const wordLeft = (page: Page) =>
  page.locator('.tomorrow-heading').evaluate((heading) => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.includes('Tomorrow')) {
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        return range.getBoundingClientRect().left;
      }
    }
    throw new Error('no "Tomorrow" in the heading');
  });

test('a line written in Tomorrow on Thursday evening is on Friday’s page', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(2026, 9, 22, 21, 0));
  await page.goto('/');
  await write(page, ['groceries']);
  await toggle(page).click();
  await expect(page.getByRole('textbox', { name: 'New tomorrow task', exact: true })).toBeFocused();
  const before = await wordLeft(page);
  await page.keyboard.type('reply to Sam');
  await page.keyboard.press('Enter');
  // Wait until the line is saved, or the reload can land before the write.
  await expect(tomorrowTasks(page)).toHaveCount(1);
  // The fold button goes once Tomorrow has a line, but the heading's word stays where it was.
  await expect(toggle(page)).toHaveCount(0);
  expect(await wordLeft(page)).toBeCloseTo(before, 0);
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

test('desktop: Tomorrow takes old lines, reorders, sends a line to the week, and gets a binned line back on undo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  // Monday's unfinished line is on an old page by Tuesday evening.
  await page.clock.setFixedTime(new Date(2026, 9, 19, 9, 0));
  await page.goto('/');
  await write(page, ['call bank']);
  await expect(tasks(page)).toHaveCount(1);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 21, 0));
  await page.reload();
  const oldTasks = page.getByRole('textbox', { name: 'Old task', exact: true });
  await expect(oldTasks).toHaveCount(1);

  await mouseDrag(page, lineOf(oldTasks.nth(0)), toggle(page));
  await expect(oldTasks).toHaveCount(0);
  await expect(tomorrowTasks(page)).toHaveCount(1);
  await expect(tomorrowTasks(page).nth(0)).toHaveValue('call bank');

  await page.getByRole('textbox', { name: 'New tomorrow task', exact: true }).click();
  for (const line of ['email Sam', 'book flights']) {
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  }
  await expect(tomorrowTasks(page)).toHaveCount(3);

  // Dropped on Tomorrow's first line, its last line moves to the top.
  await mouseDrag(page, lineOf(tomorrowTasks(page).nth(2)), lineOf(tomorrowTasks(page).nth(0)));
  await expect.poll(() => tomorrowValues(page)).toEqual(['book flights', 'call bank', 'email Sam']);

  await mouseDrag(page, lineOf(tomorrowTasks(page).nth(2)), lineOf(page.getByRole('textbox', { name: 'New goal', exact: true })));
  await expect(goals(page)).toHaveCount(1);
  await expect(goals(page).nth(0)).toHaveValue('email Sam');
  await expect(tomorrowTasks(page)).toHaveCount(2);

  // Undo puts a binned line back in Tomorrow, where it was.
  await mouseDrag(page, lineOf(tomorrowTasks(page).nth(0)), page.locator('.bin'));
  await expect.poll(() => tomorrowValues(page)).toEqual(['call bank']);
  await page.locator('.slip-region').getByRole('button', { name: 'undo', exact: true }).click();
  await expect.poll(() => tomorrowValues(page)).toEqual(['book flights', 'call bank']);
  await expect(tasks(page)).toHaveCount(0);
});
