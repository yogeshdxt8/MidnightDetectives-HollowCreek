import { expect, test, type Page } from '@playwright/test';

async function readPlayerPosition(page: Page) {
  return page.locator('#scene-root').evaluate(element => ({
    x: Number((element as HTMLElement).dataset.playerX),
    z: Number((element as HTMLElement).dataset.playerZ),
  }));
}

async function movePlayerTo(page: Page, target: { x: number; z: number }, runtimeErrors: string[] = []) {
  const joystick = page.locator('#joystick');
  const bounds = await joystick.boundingBox();
  if (!bounds) throw new Error('Movement joystick is not visible.');
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = bounds.width * .34;
  const initial = await readPlayerPosition(page);
  const timeoutMs = Math.ceil(Math.hypot(target.x - initial.x, target.z - initial.z) / 3.1 * 1000 * 8 + 20_000);
  const deadline = Date.now() + timeoutMs;
  let bestRemaining = Math.hypot(target.x - initial.x, target.z - initial.z);
  let lastProgress = Date.now();
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  try {
    while (Date.now() < deadline) {
      // Allow at least one render/update opportunity before sampling the DOM-backed position.
      await page.waitForTimeout(550);
      const current = await readPlayerPosition(page);
      const dx = target.x - current.x;
      const dz = target.z - current.z;
      const remaining = Math.hypot(dx, dz);
      if (remaining <= .3) return;
      const yaw = await page.locator('#scene-root').evaluate(element =>
        Number((element as HTMLElement).dataset.cameraYaw ?? '0')
      );
      const worldX = dx / remaining;
      const worldZ = dz / remaining;
      const joystickX = worldX * Math.cos(yaw) - worldZ * Math.sin(yaw);
      const joystickY = worldX * Math.sin(yaw) + worldZ * Math.cos(yaw);
      await page.mouse.move(centerX + joystickX * radius, centerY + joystickY * radius, { steps: 4 });
      if (remaining < bestRemaining - .02) {
        bestRemaining = remaining;
        lastProgress = Date.now();
      } else if (Date.now() - lastProgress > 15_000) {
        throw new Error(`Movement stalled at (${current.x.toFixed(2)}, ${current.z.toFixed(2)}), remaining=${remaining.toFixed(2)}, best=${bestRemaining.toFixed(2)}, target (${target.x}, ${target.z}); runtime=${JSON.stringify(await page.locator('#scene-root').evaluate(element => ({ ...element.dataset })))}; pageErrors=${runtimeErrors.join(' | ')}`);
      }
    }
  } finally {
    await page.mouse.up();
  }
  const finalPosition = await readPlayerPosition(page);
  throw new Error(`Could not reach (${target.x}, ${target.z}); ended at (${finalPosition.x.toFixed(2)}, ${finalPosition.z.toFixed(2)}).`);
}

test.beforeEach(async ({ page }) => {
  // Test the gameplay slice directly; the cinematic sedan opening is validated separately.
  await page.addInitScript(() => sessionStorage.setItem('hollow-creek-arrival-seen', '1'));
  await page.setViewportSize({ width: 390, height: 844 });
});

test('starts with immediate control and a clear key-and-exit objective', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.stack ?? error.message));
  await page.goto('/');
  await expect(page.locator('#playables-loading')).toBeHidden();
  await expect(page.locator('header')).toContainText('MIDNIGHT DETECTIVES');
  await expect(page.getByRole('heading', { name: /find the key/i })).toBeVisible();
  await expect(page.locator('#escape-objective')).toHaveText('Find the key. The exit is locked.');
  await expect(page.locator('#hint')).toHaveText('Find the key. The exit is locked.');
  await expect(page.locator('#scene-root canvas')).toBeVisible();
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#escape-action')).toBeHidden();
  await expect(page.locator('.journal')).toBeHidden();
  await expect(page.locator('#scene-root')).toHaveAttribute('data-game-interactable', 'true');
  const webgl = await page.locator('canvas').evaluate(canvas => {
    const element = canvas as HTMLCanvasElement;
    return Boolean(element.getContext('webgl2') || element.getContext('webgl'));
  });
  expect(webgl).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('completes the mandatory key, return, unlock and physical escape sequence', async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#scene-root')).toHaveAttribute('data-game-interactable', 'true');

  // Trigger the authored bell distraction on the north-east side, then cross the open north route to the key.
  await movePlayerTo(page, { x: 3.55, z: 3.2 }, runtimeErrors);
  await expect(page.locator('#escape-action')).toHaveText('MAKE NOISE');
  await page.locator('#escape-action').click();
  await movePlayerTo(page, { x: -3.25, z: 3.35 }, runtimeErrors);
  await expect(page.locator('#escape-action')).toHaveText('COLLECT KEY');
  await page.locator('#escape-action').click();
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-escape-has-key')).toBe('true');
  await expect(page.locator('#escape-objective')).toHaveText('The exit is unlocked with the key. Get there!');

  // The player must physically return to the exit; key collection alone must not open it.
  await expect(page.locator('#scene-root')).toHaveAttribute('data-escape-exit-unlocked', 'false');
  await movePlayerTo(page, { x: -3.25, z: -6.5 }, runtimeErrors);
  await movePlayerTo(page, { x: 0, z: -6.5 }, runtimeErrors);
  await expect(page.locator('#escape-action')).toHaveText('UNLOCK EXIT');
  await page.locator('#escape-action').click();
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-escape-exit-unlocked')).toBe('true');

  // The level completes only after crossing the open doorway.
  await movePlayerTo(page, { x: 0, z: -9.5 }, runtimeErrors);
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-escape-complete')).toBe('true');
  await expect(page.locator('#hint')).toHaveText('ESCAPED · CHALLENGE COMPLETE');
  await expect(page.locator('#status')).toHaveText('ESCAPE COMPLETE');
  await expect(page.locator('#escape-action')).toHaveText('PLAY AGAIN');
  await page.locator('#escape-action').click();
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-escape-complete')).toBe('false');
  await expect(page.locator('#scene-root')).toHaveAttribute('data-escape-has-key', 'false');
  await expect(page.locator('#hint')).toHaveText('Find the key. The exit is locked.');

  // Verify the cabinet cover state persists after entering and clears only when the player moves.
  await movePlayerTo(page, { x: -5.0, z: 4.5 }, runtimeErrors);
  await expect(page.locator('#escape-action')).toHaveText('HIDE');
  await page.locator('#escape-action').click();
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-player-hidden')).toBe('true');
  await movePlayerTo(page, { x: -2.7, z: 4.2 }, runtimeErrors);
  await expect.poll(() => page.locator('#scene-root').getAttribute('data-player-hidden')).toBe('false');
  expect(runtimeErrors).toEqual([]);
});

test('shows a single contextual action and keeps the touch HUD inside a phone viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#look-pad')).toBeVisible();
  await expect(page.locator('#escape-objective')).toBeVisible();
  await expect(page.locator('#escape-action')).toBeHidden();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    appHeight: document.querySelector('#app')?.getBoundingClientRect().height ?? 0,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.appHeight).toBeGreaterThan(0);
});
