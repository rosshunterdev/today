import { test, expect, type Page } from '@playwright/test';
import { lineOf, tasks, write } from './helpers';

const headings = (page: Page) => page.getByRole('textbox', { name: 'Heading', exact: true });

test('a heading is written, survives a reload, and turns back into a task', async ({ page }, testInfo) => {
  await page.goto('/');
  await write(page, ['# Job hunt', 'fix CV', 'Admin:', 'reply to gran']);
  await expect(headings(page)).toHaveCount(2);
  await expect(tasks(page)).toHaveCount(2);

  await page.reload();
  await expect(headings(page).nth(0)).toHaveValue('Job hunt');
  await expect(lineOf(headings(page).nth(0)).getByRole('button', { name: /^Cross off/ })).toHaveCount(0);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-headings.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Night pages', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-headings-night.png`, animations: 'disabled' });

  await headings(page).nth(1).click();
  await expect(headings(page).nth(1)).toHaveValue('Admin:');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await expect(tasks(page)).toHaveCount(3);
});
