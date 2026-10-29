import { defineConfig, devices } from '@playwright/test';

const runningInCi = process.env.CI === 'true';

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: runningInCi,
  fullyParallel: false,
  outputDir: 'test-results',
  reporter: runningInCi ? [['line'], ['html', { open: 'never' }]] : 'list',
  retries: runningInCi ? 1 : 0,
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'pnpm --filter @incidentlens/api start',
      reuseExistingServer: !runningInCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 60_000,
      url: 'http://localhost:4000/health/ready',
    },
    {
      command: 'pnpm --filter @incidentlens/web start',
      reuseExistingServer: !runningInCi,
      stderr: 'pipe',
      stdout: 'pipe',
      timeout: 60_000,
      url: 'http://localhost:3000',
    },
  ],
});
