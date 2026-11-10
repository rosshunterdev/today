import { test, expect, type Page } from '@playwright/test';
import { lineOf, tasks, write } from './helpers';

// Cross a line off with a pen stroke across it.
async function strike(page: Page, index: number) {
  const box = (await lineOf(tasks(page).nth(index)).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 70, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, y + 2, { steps: 10 });
  await page.mouse.up();
}

test('night pages: marks, a sub-step and a crossed-off line in both inks, and night survives a reload', async ({ page }, testInfo) => {
  await page.goto('/');
  await write(page, ['message manager', 'reply to Sam', 'pay power bill']);
  // Tab on the writing line makes the next line a sub-step.
  await page.keyboard.press('Tab');
  await page.keyboard.type('oat milk, bread');
  await page.keyboard.press('Enter');
  await expect(tasks(page)).toHaveCount(4);
  await page.getByRole('heading', { level: 1 }).click(); // leave the lines so the keyboard bar goes

  const markOf = (i: number) => lineOf(tasks(page).nth(i)).getByRole('button', { name: /^Mark:/ });
  await markOf(0).click();
  await expect(lineOf(tasks(page).nth(0))).toHaveAttribute('data-mark', 'star');
  await markOf(2).click();
  await markOf(2).click();
  await expect(markOf(2)).toHaveText('!');
  await strike(page, 1);
  await expect(lineOf(tasks(page).nth(1))).toHaveAttribute('data-done', 'true');
  await expect(lineOf(tasks(page).nth(3))).toHaveAttribute('data-indent', '1');
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-marks.png`, animations: 'disabled' });

  const html = page.locator('html');
  const night = page.getByRole('button', { name: 'Night pages', exact: true });
  await expect(html).not.toHaveAttribute('data-theme', 'night');
  await night.click();
  await expect(html).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1f1b17');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'night');
  await expect(night).toHaveAttribute('aria-pressed', 'true');
  await expect(lineOf(tasks(page).nth(1))).toHaveAttribute('data-done', 'true');
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-night.png`, animations: 'disabled' });

  await night.click();
  await expect(html).not.toHaveAttribute('data-theme', 'night');
});
