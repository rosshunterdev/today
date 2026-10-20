import { test, expect } from '@playwright/test';
import { write } from './helpers';

test('night pages: the switch turns the journal dark, and it stays dark after a reload', async ({ page }, testInfo) => {
  await page.goto('/');
  await write(page, ['message manager', 'reply to Sam']);
  const html = page.locator('html');
  const night = page.getByRole('button', { name: 'Night pages', exact: true });
  await expect(html).not.toHaveAttribute('data-theme', 'night');

  await night.click();
  await expect(html).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#202329');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'night');
  await expect(night).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-night.png`, animations: 'disabled' });

  await night.click();
  await expect(html).not.toHaveAttribute('data-theme', 'night');
});
