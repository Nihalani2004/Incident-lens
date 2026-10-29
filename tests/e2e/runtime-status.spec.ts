import { expect, test } from '@playwright/test';

test('loads IncidentLens and displays healthy API dependencies', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'IncidentLens' })).toBeVisible();
  const runtimeStatus = page.getByRole('region', { name: 'Local runtime status' });
  await expect(runtimeStatus).toContainText('API, PostgreSQL, pgvector, and Redis are connected.');
  await expect(page.getByRole('list', { name: 'Configured runtime capabilities' })).toBeVisible();
});
