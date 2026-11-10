import { test, expect, type Page } from '@playwright/test';
import { write } from './helpers';

test('write, cross off, survive reload', async ({ page }, testInfo) => {
  await page.goto('/');
  const ghost = page.getByRole('textbox', { name: 'New task' });
  await ghost.click();
  await page.keyboard.type('reply to Sam');
  await page.keyboard.press('Enter');
  await page.keyboard.type('groceries');
  await page.keyboard.press('Enter');

  const tasks = page.getByRole('textbox', { name: 'Task', exact: true });
  await expect(tasks).toHaveCount(2);
  await expect(tasks.nth(0)).toHaveValue('reply to Sam');
  await expect(tasks.nth(1)).toHaveValue('groceries');

  const first = page.locator('li.line').first();
  const box = (await first.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 70, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, y + 2, { steps: 10 });
  await page.mouse.up();
  await expect(first).toHaveAttribute('data-done', 'true');

  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-struck.png`, fullPage: true, animations: 'disabled' });

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveCount(2);
  await expect(page.locator('li.line').first()).toHaveAttribute('data-done', 'true');
  await expect(page.getByRole('textbox', { name: 'Task', exact: true }).nth(0)).toHaveValue('reply to Sam');
});

test('a build without sync keys shows no cloud', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Night pages', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sync', exact: true })).toHaveCount(0);
});

test('cross off and back with a click on the bullet', async ({ page }, testInfo) => {
  const phone = testInfo.project.name === 'phone';
  await page.goto('/');
  await write(page, ['reply to Sam', 'groceries']);

  const first = page.locator('li.line').first();
  const bullet = page.getByRole('button', { name: 'Cross off reply to Sam', exact: true });
  if (phone) await bullet.tap();
  else await bullet.click();
  await expect(first).toHaveAttribute('data-done', 'true');
  await expect(bullet).toHaveAttribute('aria-pressed', 'true');

  // With a mouse, the next dot previews its cross.
  if (!phone) await page.getByRole('button', { name: 'Cross off groceries', exact: true }).hover();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-bullet.png`, animations: 'disabled' });

  if (phone) await bullet.tap();
  else await bullet.click();
  await expect(first).toHaveAttribute('data-done', 'false');
  await page.reload();
  await expect(page.locator('li.line').first()).toHaveAttribute('data-done', 'false');
});

const rootPx = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

test('desktop: two panels sit side by side at a readable width, and type grows only a little with the window', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wide layout');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await write(page, ['reply to Sam', 'groceries']);
  await page.getByRole('textbox', { name: 'New goal', exact: true }).click();
  await page.keyboard.type('finish cloud assignment');
  await page.keyboard.press('Enter');

  // A little over 1x at 1920px. The panels stop at 68rem and sit in the middle of the window.
  const root = await rootPx(page);
  expect(root).toBeCloseTo(16.7, 0);
  const book = (await page.locator('.book').boundingBox())!;
  expect(book.width).toBeCloseTo(68 * root, 0);
  expect(book.x + book.width / 2).toBeCloseTo(960, 0);
  // Today's panel is the wider one, on the left, and the two start level.
  const left = (await page.locator('main').boundingBox())!;
  const right = (await page.locator('.more-page').boundingBox())!;
  expect(left.x).toBeLessThan(right.x);
  expect(left.width).toBeGreaterThan(right.width);
  expect(left.y).toBeCloseTo(right.y, 0);
  await page.screenshot({ path: 'e2e/screenshots/desktop-wide.png', animations: 'disabled' });

  // Crossing off takes no longer a stroke than it did on the narrower page.
  const first = page.locator('li.line').first();
  const line = (await first.boundingBox())!;
  const y = line.y + line.height / 2;
  await page.mouse.move(line.x + 70, y);
  await page.mouse.down();
  await page.mouse.move(line.x + 300, y + 2, { steps: 10 });
  await page.mouse.up();
  await expect(first).toHaveAttribute('data-done', 'true');

  // 1x at the breakpoint, so nothing jumps there, and no more than 1.125x on very wide screens.
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await rootPx(page)).toBeCloseTo(16, 0);
  await page.setViewportSize({ width: 3840, height: 2160 });
  expect(await rootPx(page)).toBe(18);
});

test('phone: text stays its normal size', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'narrow layout');
  await page.goto('/');
  expect(await rootPx(page)).toBe(16);
});
