import { expect, test } from '@playwright/test';

test('renders the investigation interface and WebGL scene', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#playables-loading')).toBeHidden();
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
  await expect(page.locator('.journal')).toBeHidden();
  await expect(page.locator('#case-toggle')).toBeVisible();
  await expect(page.locator('.overlay h1')).toBeHidden();
  await expect(page.locator('.overlay > small')).toBeVisible();
  await page.locator('#case-toggle').click();
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


async function readPlayerPosition(page: import('@playwright/test').Page) {
  return page.locator('#scene-root').evaluate(element => ({
    x: Number((element as HTMLElement).dataset.playerX),
    z: Number((element as HTMLElement).dataset.playerZ),
  }));
}

async function movePlayerTo(page: import('@playwright/test').Page, target: { x: number; z: number }) {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  const joystick = page.locator('#joystick');
  const bounds = await joystick.boundingBox();
  if (!bounds) throw new Error('Movement joystick is not visible.');

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = bounds.width * 0.34;
  const hint = page.locator('#hint');
  const initial = await readPlayerPosition(page);
  if (!Number.isFinite(initial.x) || !Number.isFinite(initial.z)) {
    throw new Error('Live investigator coordinates were not published by the scene.');
  }

  const initialDistance = Math.hypot(target.x - initial.x, target.z - initial.z);
  if (initialDistance <= 0.35) return;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();

  const timeoutMs = Math.ceil((initialDistance / 3.1) * 1000 * 5 + 7000);
  const deadline = Date.now() + timeoutMs;
  let previous = initial;
  let lastProgressAt = Date.now();
  let current = initial;
  let arrived = false;

  try {
    while (Date.now() < deadline) {
      current = await readPlayerPosition(page);
      const remainingX = target.x - current.x;
      const remainingZ = target.z - current.z;
      const remaining = Math.hypot(remainingX, remainingZ);

      if (remaining <= 0.35) {
        arrived = true;
        break;
      }

      // Re-aim from the observed position, not a guessed previous waypoint.
      // Pointer Y maps directly to joystick Y; the controller applies its forward-axis inversion.
      // Send intermediate pointer events so the held joystick remains responsive in headless CI.
      await page.mouse.move(
        centerX + (remainingX / remaining) * radius,
        centerY + (remainingZ / remaining) * radius,
        { steps: 4 }
      );

      const moved = Math.hypot(current.x - previous.x, current.z - previous.z);
      if (moved >= 0.025) {
        previous = current;
        lastProgressAt = Date.now();
      } else if (Date.now() - lastProgressAt > 3500) {
        throw new Error(
          `Investigator movement stalled at (${current.x.toFixed(2)}, ${current.z.toFixed(2)}) ` +
          `with ${remaining.toFixed(2)} units remaining to (${target.x}, ${target.z}); ` +
          `hint="${(await hint.textContent())?.trim()}" and joystick="${await page.locator('#stick').evaluate(element => getComputedStyle(element).transform)}"; ` +
          `runtime=${JSON.stringify(await page.locator('#scene-root').evaluate(element => ({ ...element.dataset })))}; ` +
          `errors=${JSON.stringify(runtimeErrors)}.`
        );
      }

      await page.waitForTimeout(80);
    }
  } finally {
    await page.mouse.up();
  }

  if (!arrived) {
    const finalPosition = await readPlayerPosition(page);
    throw new Error(
      `Investigator did not reach waypoint (${target.x}, ${target.z}) within ${timeoutMs}ms. ` +
      `Started at (${initial.x.toFixed(2)}, ${initial.z.toFixed(2)}), ` +
      `ended at (${finalPosition.x.toFixed(2)}, ${finalPosition.z.toFixed(2)}), ` +
      `remaining distance ${Math.hypot(target.x - finalPosition.x, target.z - finalPosition.z).toFixed(2)}.`
    );
  }

  await page.waitForTimeout(150);
}
async function inspectNearestClue(page: import('@playwright/test').Page) {
  const canvas = page.locator('#scene-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Investigation scene is not visible.');

  const count = page.locator('#count');
  const before = Number(await count.textContent());
  // The game intentionally accepts taps within 9% of the scene's smaller
  // dimension around a clue's projected screen position. Sweep a grid with
  // overlapping coverage instead of guessing that the marker is at screen
  // center; every tap still goes through the real canvas pointer handler.
  const spacing = 64;
  for (let y = bounds.y + spacing / 2; y < bounds.y + bounds.height; y += spacing) {
    for (let x = bounds.x + spacing / 2; x < bounds.x + bounds.width; x += spacing) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(45);
      const current = Number(await count.textContent());
      if (current > before) {
        await expect(count).toHaveText(String(before + 1));
        return;
      }
    }
  }
  throw new Error('No visible in-range clue responded to canvas taps; inspect the Playwright trace.');
}

test('a fresh player collects all three clues, completes the deduction, and keeps progress after refresh', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForTimeout(350);
  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#deduction-open')).toBeHidden();

  // The direct route to the eastern clue crosses the fountain collision radius.
  // First move to the north-west side, then cross the open northern walkway.
  await movePlayerTo(page, { x: -3.3, z: 0.6 });
  await movePlayerTo(page, { x: 1.8, z: 0.6 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('1');

  // The fountain has a circular collision/exclusion zone centered near
  // z=-2.8. Route around its north side instead of trying to walk through it.
  await movePlayerTo(page, { x: -3.3, z: 0.6 });
  await movePlayerTo(page, { x: -3.3, z: -1.2 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('2');

  await movePlayerTo(page, { x: -3.3, z: 1.5 });
  await movePlayerTo(page, { x: 3.2, z: 1.5 });
  await movePlayerTo(page, { x: 3.2, z: -3.7 });
  await inspectNearestClue(page);
  await expect(page.locator('#count')).toHaveText('3');
  await page.locator('#case-toggle').click();
  await expect(page.locator('#deduction-open')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem('midnight-detectives-hollow-creek.save.v2');
    return raw ? JSON.parse(raw).discoveredClueIds.length : 0;
  })).toBe(3);

  // A real browser reload must restore the progress created through scene interactions.
  await page.reload();
  await expect(page.locator('#count')).toHaveText('3');
  await page.locator('#case-toggle').click();
  await expect(page.locator('.journal')).toBeVisible();
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
  await page.locator('#case-toggle').click();
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
