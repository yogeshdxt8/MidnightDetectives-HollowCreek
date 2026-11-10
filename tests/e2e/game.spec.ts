import { expect, test } from '@playwright/test';

test('arrival driver receives GO immediately after passenger clears, boards, and departs', async ({ page }) => {
  // Low-end headless WebGL can produce fewer frames than wall-clock time suggests.
  // The workflow is event-gated, so wait for latched physical milestones rather
  // than polling transient state names that can change between browser polls.
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const scene = page.locator('#scene-root');
  const waitForMilestone = async (attribute: string, expected = 'true', timeout = 240_000) => {
    try {
      await page.waitForFunction(
        ({ attribute, expected }) => document.querySelector('#scene-root')?.getAttribute(attribute) === expected,
        { attribute, expected },
        { timeout }
      );
    } catch {
      const runtime = await scene.evaluate(element => ({ ...((element as HTMLElement).dataset) }));
      throw new Error(`Arrival milestone ${attribute}=${expected} was not reached. Runtime: ${JSON.stringify(runtime)}`);
    }
  };

  await waitForMilestone('data-player-exit-reached');
  await waitForMilestone('data-driver-seated-reached');
  await waitForMilestone('data-driver-departed-reached');
  await expect(scene).toHaveAttribute('data-arrival-driver-state', 'departed');
  await expect(scene).toHaveAttribute('data-arrival-car-parked', 'true');
  await expect(scene).toHaveAttribute('data-driver-door-opened', 'true');
  await expect(scene).toHaveAttribute('data-passenger-door-opened', 'true');

  const events = await scene.getAttribute('data-arrival-workflow-events');
  expect(events?.split(',')).toEqual([
    'dropoff-reached',
    'car-parked',
    'driver-door-opened',
    'driver-exited',
    'driver-door-closed',
    'passenger-door-opened',
    'passenger-exited',
    'player-clear-of-car',
    'driver-go-commanded',
    'driver-at-door',
    'driver-boarded',
    'driver-door-close-requested',
    'driver-door-closed-after-boarding',
    'departure-route-completed'
  ]);
  await expect(scene).toHaveAttribute('data-player-exit-reached', 'true');
  await expect(scene).toHaveAttribute('data-arrival-ai-rejected-events', '0');
});
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
  const initialCameraYaw = await page.locator('#scene-root').evaluate(element =>
    Number((element as HTMLElement).dataset.cameraYaw ?? '0')
  );
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

      // Re-aim from authoritative world-space coordinates after the arrival sequence has
      // detached the investigator from the vehicle. Never drive a seated passenger via the joystick.
      // Send intermediate pointer events so the held joystick remains responsive in headless CI.
      const cameraYaw = await page.locator('#scene-root').evaluate(element =>
        Number((element as HTMLElement).dataset.cameraYaw ?? '0')
      );
      // Convert the desired world-space direction into the camera-relative
      // joystick basis used by the runtime. World X/Z must not be sent as
      // joystick X/Y once the player has rotated the camera.
      const worldX = remainingX / remaining;
      const worldZ = remainingZ / remaining;
      const joystickX = worldX * Math.cos(cameraYaw) - worldZ * Math.sin(cameraYaw);
      const joystickY = worldX * Math.sin(cameraYaw) + worldZ * Math.cos(cameraYaw);
      await page.mouse.move(
        centerX + joystickX * radius,
        centerY + joystickY * radius,
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
      `remaining distance ${Math.hypot(target.x - finalPosition.x, target.z - finalPosition.z).toFixed(2)}; ` +
      `runtime=${JSON.stringify(await page.locator('#scene-root').evaluate(element => ({ ...element.dataset })))}.`
    );
  }

  const finalCameraYaw = await page.locator('#scene-root').evaluate(element =>
    Number((element as HTMLElement).dataset.cameraYaw ?? '0')
  );
  const cameraYawDelta = Math.atan2(Math.sin(finalCameraYaw - initialCameraYaw), Math.cos(finalCameraYaw - initialCameraYaw));
  if (Math.abs(cameraYawDelta) > 0.01) {
    throw new Error(`Joystick movement unexpectedly rotated the camera by ${cameraYawDelta.toFixed(3)} radians.`);
  }
  await page.waitForTimeout(150);
}
test('a fresh player collects all three clues, completes the deduction, and keeps progress after refresh', async ({ page }) => {
  test.setTimeout(120_000);
  // This test covers investigation progression, not the cinematic arrival. Skip
  // the one-time intro so its 35-second timeline cannot consume the movement budget.
  await page.addInitScript(() => sessionStorage.setItem('hollow-creek-arrival-seen', '1'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForTimeout(350);
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-player-ready'), { timeout: 30_000 }).toBe('true');
  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#deduction-open')).toBeHidden();

  // The direct route to the eastern clue crosses the fountain collision radius.
  // First move to the north-west side, then cross the open northern walkway.
  await movePlayerTo(page, { x: -3.3, z: 0.6 });
  await movePlayerTo(page, { x: 1.8, z: 0.6 });
  // Pickup is proximity-based: walking through the clue radius records it;
  // the test deliberately performs no canvas tap or inspect interaction.
  await expect(page.locator('#count')).toHaveText('1');

  // The fountain has a circular collision/exclusion zone centered near
  // z=-2.8. Route around its north side instead of trying to walk through it.
  await movePlayerTo(page, { x: -3.3, z: 0.6 });
  await movePlayerTo(page, { x: -3.3, z: -1.2 });
  await expect(page.locator('#count')).toHaveText('2');

  await movePlayerTo(page, { x: -3.3, z: 1.5 });
  await movePlayerTo(page, { x: 3.2, z: 1.5 });
  await movePlayerTo(page, { x: 3.2, z: -3.7 });
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
