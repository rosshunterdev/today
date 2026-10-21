import type { Locator, Page } from '@playwright/test';

export async function write(page: Page, lines: string[]) {
  await page.getByRole('textbox', { name: 'New task', exact: true }).click();
  for (const line of lines) {
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  }
}

export async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Mouse drag by the dotted grip, which appears on hover.
export async function mouseDrag(page: Page, line: Locator, target: Locator) {
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
// whileLifted runs once the line is picked up, before it moves: for checking the page mid-drag.
export async function touchDrag(page: Page, line: Locator, target: Locator, whileLifted?: () => Promise<void>) {
  const from = await center(line);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  await page.waitForTimeout(450);
  // Measured once the line is lifted: some targets (the phone bin) only appear during a drag.
  await target.waitFor({ state: 'visible' });
  const to = await center(target);
  await whileLifted?.();
  for (let i = 1; i <= 15; i++) {
    const t = i / 15;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export const tasks = (page: Page) => page.getByRole('textbox', { name: 'Task', exact: true });
export const goals = (page: Page) => page.getByRole('textbox', { name: 'Goal', exact: true });
export const lineOf = (input: Locator) => input.locator('xpath=ancestor::li[1]');

// Notes save on every keystroke; wait for the last write before reloading.
export async function savedNote(page: Page, text: string) {
  await page.waitForFunction(
    (expected) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('today');
        open.onsuccess = () => {
          const all = open.result.transaction('tasks').objectStore('tasks').getAll();
          all.onsuccess = () => {
            resolve(all.result.some((t: { notes?: string }) => t.notes === expected));
            open.result.close();
          };
        };
      }),
    text,
  );
}
