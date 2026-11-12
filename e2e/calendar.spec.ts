import { test, expect, type Page } from '@playwright/test';
import { tasks } from './helpers';

const view = (page: Page, name: string) => page.getByRole('link', { name, exact: true });
const day = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) });
const newTask = (page: Page) => page.getByRole('textbox', { name: 'New task', exact: true });

async function writeOn(page: Page, dayName: string, text: string) {
  await day(page, dayName).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(dayName);
  await newTask(page).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await expect(tasks(page)).toHaveCount(1);
}

test('a line written on a coming day in the calendar is under Tomorrow, then on today’s page when its day comes', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(2026, 9, 22, 21, 0)); // Thursday 22 October
  await page.goto('/');
  await view(page, 'Calendar').click();
  await expect(view(page, 'Calendar')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('October 2026');
  await expect(day(page, 'Thursday 22 October')).toHaveAttribute('aria-current', 'date');

  await writeOn(page, 'Friday 23 October', 'reply to Sam');
  await writeOn(page, 'Friday 30 October', 'dentist');
  // Each day's name says what is on it.
  await expect(page.getByRole('button', { name: 'Friday 23 October, 1 to do, 0 done', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Friday 30 October, 1 to do, 0 done', exact: true })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-calendar.png`, animations: 'disabled' });

  // The view is in the address, so a reload stays on the calendar.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('October 2026');

  // Tomorrow's line is the same line Today shows under Tomorrow.
  await view(page, 'Today').click();
  await expect(page.getByRole('textbox', { name: 'Tomorrow task', exact: true })).toHaveValue('reply to Sam');
  await expect(tasks(page)).toHaveCount(0);

  // On the 30th the dentist is simply on today's page.
  await page.clock.setFixedTime(new Date(2026, 9, 30, 9, 0));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Friday');
  await expect(tasks(page)).toHaveCount(1);
  await expect(tasks(page).nth(0)).toHaveValue('dentist');
});

test('a past day in the calendar is read only, and > sends an open line to today', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 21, 9, 0)); // Wednesday 21 October
  await page.goto('/');
  await newTask(page).click();
  await page.keyboard.type('return library books');
  await page.keyboard.press('Enter');
  await expect(tasks(page)).toHaveCount(1);

  await page.clock.setFixedTime(new Date(2026, 9, 23, 9, 0)); // two days on
  await page.goto('/#calendar');
  await day(page, 'Wednesday 21 October').click();
  const past = page.getByRole('textbox', { name: 'Past task', exact: true });
  await expect(past).toHaveValue('return library books');
  await expect(past).not.toBeEditable();
  await expect(newTask(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Move return library books to today', exact: true }).click();
  await expect(page.getByText('Nothing was written on this day.')).toBeVisible();
  await view(page, 'Today').click();
  await expect(tasks(page)).toHaveCount(1);
  await expect(tasks(page).nth(0)).toHaveValue('return library books');
});
