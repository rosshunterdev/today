import { test, expect, type Locator, type Page } from '@playwright/test';

async function write(page: Page, lines: string[]) {
  await page.getByRole('textbox', { name: 'New task', exact: true }).click();
  for (const line of lines) {
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  }
}

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Mouse drag by the ⠿ handle, which appears on hover.
async function mouseDrag(page: Page, line: Locator, target: Locator) {
  await line.hover();
  const from = await center(line.getByRole('button', { name: 'Reorder', exact: true }));
  const to = await center(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
}

// Long-press then drag, through real touch events (Playwright's touchscreen can only tap).
async function touchDrag(page: Page, line: Locator, target: Locator) {
  const from = await center(line);
  const to = await center(target);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  await page.waitForTimeout(450);
  for (let i = 1; i <= 15; i++) {
    const t = i / 15;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const tasks = (page: Page) => page.getByRole('textbox', { name: 'Task', exact: true });
const goals = (page: Page) => page.getByRole('textbox', { name: 'Goal', exact: true });
const lineOf = (input: Locator) => input.locator('xpath=ancestor::li[1]');

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

test('phone: long-press a task onto the week tab, then drag it back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch drag');
  await page.goto('/');
  await write(page, ['groceries', 'work on assignment']);
  await page.getByRole('heading', { level: 1 }).click(); // leave the line so the keyboard bar goes

  const tab = page.getByRole('button', { name: /^Week · / });
  await expect(tab).toHaveText('Week · 0');
  await touchDrag(page, lineOf(tasks(page).nth(1)), tab);
  await expect(tab).toHaveText('Week · 1');
  await expect(tasks(page)).toHaveCount(1);

  await tab.click();
  await expect(goals(page).nth(0)).toHaveValue('work on assignment');
  await page.screenshot({ path: 'e2e/screenshots/phone-week.png', animations: 'disabled' });

  await touchDrag(page, lineOf(goals(page).nth(0)), lineOf(tasks(page).nth(0)));
  await expect(tasks(page)).toHaveCount(2);
  await expect(tasks(page).nth(0)).toHaveValue('work on assignment');
});
