// Proves the renderer works in a plain browser against the mock bridge.
// The UI agent replaces these with tests of the real interface; keep one test that opens
// the app, sees lessons, and saves a screenshot.

import { expect, test } from '@playwright/test';
import { openApp, shot } from './helpers';

test('the lesson list renders from the mock bridge', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await openApp(page);
  await expect(page.getByTestId('bridge')).toHaveText('mock bridge');
  await expect(page.getByTestId('lesson-item')).toHaveCount(46);
  await expect(page.getByTestId('lesson-list')).toContainText('Hello, world');
  await expect(page.getByTestId('lesson-list')).toContainText('Stage 4: Functions');

  await shot(page, 'skeleton-light');
  expect(errors).toEqual([]);
});

test('a run streams output, asks for input, and the tutor speaks', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page);

  await page.getByTestId('run').click();
  await expect(page.getByTestId('console')).toContainText('What is your name?');
  await page.getByTestId('stdin').fill('Sam');
  await page.getByTestId('stdin').press('Enter');
  await expect(page.getByTestId('console')).toContainText('Hello, Sam');
  await expect(page.getByTestId('console')).toContainText('exit code 0');

  await page.getByTestId('code').fill('pritn("hello")\n');
  await expect(page.getByTestId('tutor-message')).toHaveCount(1);
  await expect(page.getByTestId('tutor-message')).toContainText('line 1');

  await page.getByTestId('run').click();
  await expect(page.getByTestId('console')).toContainText('NameError');
  await expect(page.getByTestId('tutor-message')).toHaveCount(2);

  await shot(page, 'skeleton-dark');
});
