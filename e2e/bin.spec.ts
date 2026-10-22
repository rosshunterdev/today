import { test, expect } from '@playwright/test';
import { lineOf, mouseDrag, tasks, touchDrag, write } from './helpers';

test('desktop: drag a line into the bin, undo it, then bin one for good', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse drag');
  await page.goto('/');
  await write(page, ['groceries', 'reply to Sam', 'call bank']);
  const bin = page.locator('.bin');
  const slip = page.locator('.slip-region'); // dnd-kit has a status region of its own
  const undo = slip.getByRole('button', { name: 'undo', exact: true });

  await mouseDrag(page, lineOf(tasks(page).nth(1)), bin);
  await expect(tasks(page)).toHaveCount(2);
  await expect(slip).toContainText('binned “reply to Sam”');
  await page.screenshot({ path: 'e2e/screenshots/desktop-bin.png', animations: 'disabled' });

  await undo.click();
  await expect(tasks(page)).toHaveCount(3);
  await expect(tasks(page).nth(1)).toHaveValue('reply to Sam');

  // Ctrl+Z undoes a bin while the slip shows.
  await mouseDrag(page, lineOf(tasks(page).nth(0)), bin);
  await expect(tasks(page)).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(tasks(page)).toHaveCount(3);
  await expect(tasks(page).nth(0)).toHaveValue('groceries');

  // Left alone, the slip goes and the line stays binned.
  await mouseDrag(page, lineOf(tasks(page).nth(2)), bin);
  await expect(tasks(page)).toHaveCount(2);
  await expect(undo).toBeHidden({ timeout: 7000 });
  await page.reload();
  await expect(tasks(page)).toHaveCount(2);
});

test('phone: the bin appears while a line is lifted, and undo brings the line back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch drag');
  await page.goto('/');
  await write(page, ['groceries', 'reply to Sam']);
  await page.getByRole('heading', { level: 1 }).click(); // leave the line so the keyboard bar goes
  const bin = page.locator('.bin');
  await expect(bin).toBeHidden();

  await touchDrag(page, lineOf(tasks(page).nth(0)), bin);
  await expect(tasks(page)).toHaveCount(1);
  await expect(bin).toBeHidden();
  const slip = page.locator('.slip-region'); // dnd-kit has a status region of its own
  await expect(slip).toContainText('binned “groceries”');
  await page.screenshot({ path: 'e2e/screenshots/phone-bin.png', animations: 'disabled' });

  await slip.getByRole('button', { name: 'undo', exact: true }).click();
  await expect(tasks(page)).toHaveCount(2);
  await expect(tasks(page).nth(0)).toHaveValue('groceries');

  // Binning again before the slip goes: the slip sits where the bin appears, so it steps aside while a line is lifted.
  await touchDrag(page, lineOf(tasks(page).nth(0)), bin);
  await expect(slip).toContainText('binned “groceries”');
  // The slip shows before the list redraws: wait for the line to go, or the next press lands where it used to be.
  await expect(tasks(page)).toHaveCount(1);
  await touchDrag(page, lineOf(tasks(page).nth(0)), bin, async () => {
    await expect(slip).toBeHidden({ timeout: 500 }); // short: the slip would also go by itself after 5s
  });
  await expect(tasks(page)).toHaveCount(0);
  await expect(slip).toContainText('binned “reply to Sam”');
});
