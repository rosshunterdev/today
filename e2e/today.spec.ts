import { test, expect } from '@playwright/test';

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
