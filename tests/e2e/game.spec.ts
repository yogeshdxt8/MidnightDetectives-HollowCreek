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
  const save = {
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

  await page.addInitScript(value => {
    localStorage.setItem('midnight-detectives-hollow-creek.save.v2', JSON.stringify(value));
  }, save);
  await page.goto('/');

  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#relic-inventory')).toContainText('Fountain relic');
  await expect(page.locator('#evidence')).toContainText('Torn note');
  await expect(page.locator('#evidence')).toContainText('Muddy footprint');
  await expect(page.locator('#evidence')).toContainText('Brass key');
  await expect(page.locator('#location-evidence')).toBeVisible();
  await expect(page.locator('#location-evidence-title')).toHaveText('Three-line metal imprint');
  await expect(page.locator('#puzzle-open')).toBeHidden();
});
