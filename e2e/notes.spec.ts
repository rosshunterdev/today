import { test, expect, type Locator, type Page } from '@playwright/test';
import { goals, lineOf, mouseDrag, savedNote, tasks, write } from './helpers';

const toggleOf = (input: Locator) => lineOf(input).getByRole('button', { name: /^Notes for / });
const notesBox = (page: Page) => page.getByRole('textbox', { name: /^Notes for / });

test('desktop: a note survives a reload and a move into the week', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await page.goto('/');
  await write(page, ['message manager', 'groceries']);
  await expect(tasks(page)).toHaveCount(2);

  await tasks(page).nth(0).hover();
  await toggleOf(tasks(page).nth(0)).click();
  await page.keyboard.type('ask about software projects');
  await page.keyboard.press('Enter');
  await page.keyboard.type('will she review my CV');
  await savedNote(page, 'ask about software projects\nwill she review my CV');
  await page.screenshot({ path: 'e2e/screenshots/desktop-notes.png', animations: 'disabled' });

  // A saved note comes back open under its line, without the cursor in it.
  await page.reload();
  await expect(toggleOf(tasks(page).nth(0))).toHaveAttribute('data-has', 'true');
  await expect(notesBox(page)).toHaveValue('ask about software projects\nwill she review my CV');
  await expect(notesBox(page)).not.toBeFocused();

  await mouseDrag(page, lineOf(tasks(page).nth(0)), lineOf(page.getByRole('textbox', { name: 'New goal', exact: true })));
  await expect(goals(page)).toHaveCount(1);
  await expect(notesBox(page)).toHaveValue('ask about software projects\nwill she review my CV');
});

test('desktop: a note is still open under its line on the next day’s old page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'old pages sit beside today on wide screens');
  await page.clock.setFixedTime(new Date(2026, 9, 19, 9, 0));
  await page.goto('/');
  await write(page, ['message manager']);
  await expect(tasks(page)).toHaveCount(1);
  await tasks(page).nth(0).hover();
  await toggleOf(tasks(page).nth(0)).click();
  await page.keyboard.type('ask about software projects');
  await savedNote(page, 'ask about software projects');

  await page.clock.setFixedTime(new Date(2026, 9, 20, 9, 0));
  await page.reload();
  const oldTask = page.getByRole('textbox', { name: 'Old task', exact: true });
  await expect(oldTask).toHaveValue('message manager');
  await expect(notesBox(page)).toHaveValue('ask about software projects');
  await page.screenshot({ path: 'e2e/screenshots/desktop-old-notes.png', animations: 'disabled' });
});

test('phone: tapping the right end of a line edits it instead of opening a hidden note', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch');
  await page.goto('/');
  await write(page, ['message manager', 'groceries']);
  await expect(tasks(page)).toHaveCount(2);
  await page.getByRole('heading', { level: 1 }).click(); // leave the lines

  const box = (await lineOf(tasks(page).nth(0)).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width - 12, box.y + box.height / 2);
  await expect(tasks(page).nth(0)).toBeFocused();
  await expect(notesBox(page)).toHaveCount(0);
});

test('phone: ✎ appears while editing a line and opens its note', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch');
  await page.goto('/');
  await write(page, ['message manager']);
  await expect(tasks(page)).toHaveCount(1);

  await tasks(page).nth(0).click();
  await toggleOf(tasks(page).nth(0)).click();
  await page.keyboard.type('ask about software projects');
  await expect(notesBox(page)).toHaveValue('ask about software projects');
  await savedNote(page, 'ask about software projects');
  await page.screenshot({ path: 'e2e/screenshots/phone-notes.png', animations: 'disabled' });
});
