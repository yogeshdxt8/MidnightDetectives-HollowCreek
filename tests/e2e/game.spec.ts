import { expect, test } from '@playwright/test';

test('renders the investigation interface and WebGL scene', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('header')).toContainText('MIDNIGHT DETECTIVES');
  await expect(page.getByRole('heading', { name: /the town keeps/i })).toBeVisible();
  await expect(page.locator('#scene-root canvas')).toBeVisible();
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#look-pad')).toBeVisible();
  await expect(page.locator('.journal')).toBeVisible();
  await expect(page.locator('#count')).toHaveText('0');

  const webgl = await page.locator('canvas').evaluate(canvas => {
    const element = canvas as HTMLCanvasElement;
    return Boolean(element.getContext('webgl2') || element.getContext('webgl'));
  });
  expect(webgl).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('keeps the touch investigation controls usable on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#look-pad')).toBeVisible();
  await expect(page.locator('.journal')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    appHeight: document.querySelector('#app')?.getBoundingClientRect().height ?? 0,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.documentWidth);
  expect(dimensions.appHeight).toBeGreaterThan(0);
});

test('restores solved fountain and Clock Tower evidence from browser save', async ({ page }) => {
  page.on('pageerror', error => console.log('[browser pageerror]', error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('[browser console error]', message.text()); });
  await page.addInitScript(() => {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    const seededSave = {
      version: 2,
      activeCaseId: 'case-001',
      discoveredClueIds: ['note', 'print', 'key'],
      solvedPuzzleIds: ['fountain-seal'],
      completedCaseIds: [],
      investigation: {
        discoveredEvidenceIds: ['three-line-imprint'],
        trackedLeadIds: ['clocktower-service-door'],
        unlockedLocationIds: ['clocktower-service-entrance'],
        searchedLocationIds: ['clocktower-service-entrance'],
        solvedPuzzleIds: [],
        askedKeeperTopicIds: [],
        presentedKeeperEvidenceIds: [],
        recoveredObjectIds: ['fountain-relic'],
        completedDeductionIds: []
      }
    };
    localStorage.setItem('midnight-detectives-hollow-creek.save.v2', JSON.stringify(seededSave));
  });
  await page.goto('/');
  const storedSave = await page.evaluate(() => localStorage.getItem('midnight-detectives-hollow-creek.save.v2'));
  expect(storedSave, 'browser save fixture must exist before restoration').not.toBeNull();
  expect(JSON.parse(storedSave!).discoveredClueIds, 'browser storage must contain the seeded clues').toEqual(['note', 'print', 'key']);
  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#relic-inventory')).toContainText('Fountain relic');
  await expect(page.locator('#evidence')).toContainText('Torn note');
  await expect(page.locator('#evidence')).toContainText('Muddy footprint');
  await expect(page.locator('#evidence')).toContainText('Brass key');
  await page.locator('#board-open').click();
  await expect(page.locator('#board-panel')).toBeVisible();
  await expect(page.locator('#board-evidence')).toContainText('Three-line imprint');
  await expect(page.locator('#board-review-clocktower')).toBeVisible();
  await page.locator('#board-review-clocktower').click();
  await expect(page.locator('#location-panel')).toBeVisible();
  await expect(page.locator('#location-evidence')).toBeVisible();
  await expect(page.locator('#location-evidence-title')).toHaveText('Three-line metal imprint');
  await expect(page.locator('#puzzle-open')).toBeHidden();
});


async function movePlayerTo(page: import('@playwright/test').Page, from: { x: number; z: number }, to: { x: number; z: number }) {
  const joystick = page.locator('#joystick');
  const bounds = await joystick.boundingBox();
  if (!bounds) throw new Error('Movement joystick is not visible.');
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0) return;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = bounds.width * 0.30;
  const length = Math.hypot(dx, dz);
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + (dx / length) * radius, centerY - (dz / length) * radius);
  await page.waitForTimeout((distance / 3.1) * 1000 + 140);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

async function inspectNearestClue(page: import('@playwright/test').Page) {
  const canvas = page.locator('#scene-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Investigation scene is not visible.');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 26);
}

test('a fresh player collects all three clues, completes the deduction, and keeps progress after refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#deduction-open')).toBeHidden();

  // Navigate around the fountain exclusion zone and inspect each glowing clue in the 3D scene.
  await movePlayerTo(page, { x: 0, z: 5.2 }, { x: 1.8, z: 0.6 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('1');

  await movePlayerTo(page, { x: 1.8, z: 0.6 }, { x: -3.3, z: -1.2 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('2');

  await movePlayerTo(page, { x: -3.3, z: -1.2 }, { x: -3.3, z: 1.5 });
  await movePlayerTo(page, { x: -3.3, z: 1.5 }, { x: 3.2, z: 1.5 });
  await movePlayerTo(page, { x: 3.2, z: 1.5 }, { x: 3.2, z: -3.7 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#deduction-open')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem('midnight-detectives-hollow-creek.save.v2');
    return raw ? JSON.parse(raw).discoveredClueIds.length : 0;
  })).toBe(3);

  // A real browser reload must restore the progress created through scene interactions.
  await page.reload();
  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#evidence')).toContainText('Torn note');
  await expect(page.locator('#evidence')).toContainText('Muddy footprint');
  await expect(page.locator('#evidence')).toContainText('Brass key');
  await expect(page.locator('#deduction-open')).toBeVisible();

  await page.locator('#deduction-open').click();
  await expect(page.locator('#deduction-panel')).toBeVisible();
  await page.locator('[data-option-id="footprint-key"]').click();
  await expect(page.locator('#case-result')).toBeVisible();
  await expect(page.locator('#status')).toHaveText('DEDUCTION COMPLETE');
});

test('mobile notifications and puzzle dialog stay clear of touch controls and inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('midnight-detectives-hollow-creek.save.v2', JSON.stringify({
      version: 2,
      activeCaseId: 'case-001',
      discoveredClueIds: ['note'],
      solvedPuzzleIds: [],
      completedCaseIds: [],
      investigation: {
        discoveredEvidenceIds: [], trackedLeadIds: [], unlockedLocationIds: [],
        searchedLocationIds: [], solvedPuzzleIds: [], askedKeeperTopicIds: [],
        presentedKeeperEvidenceIds: [], recoveredObjectIds: [], completedDeductionIds: []
      }
    }));
  });
  await page.goto('/');
  await expect(page.locator('#puzzle-open')).toBeVisible();

  const canvas = page.locator('#scene-root canvas');
  const canvasBounds = await canvas.boundingBox();
  if (!canvasBounds) throw new Error('Investigation scene is not visible.');
  await page.mouse.click(canvasBounds.x + 12, canvasBounds.y + 12);
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/show/);

  const toastAndControls = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    return {
      toast: rect('#toast'),
      joystick: rect('#joystick'),
      look: rect('#look-pad'),
      heading: rect('.overlay h1')
    };
  });
  const overlaps = (a: typeof toastAndControls.toast, b: typeof toastAndControls.toast) =>
    Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
  expect(overlaps(toastAndControls.toast, toastAndControls.joystick)).toBe(false);
  expect(overlaps(toastAndControls.toast, toastAndControls.look)).toBe(false);
  expect(overlaps(toastAndControls.toast, toastAndControls.heading)).toBe(false);

  await page.locator('#puzzle-open').click();
  const dialog = page.locator('#puzzle-panel');
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBounds!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(390);
  expect(dialogBounds!.y + dialogBounds!.height).toBeLessThanOrEqual(844);
  await page.locator('[data-symbol="moon"]').click();
  await page.locator('[data-symbol="star"]').click();
  await page.locator('[data-symbol="bell"]').click();
  await expect(page.locator('#puzzle-sequence')).toContainText('SEAL OPEN');
});
