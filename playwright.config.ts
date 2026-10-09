import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
process.env.E2E_PASSWORD = process.env.E2E_PASSWORD || randomBytes(24).toString('base64url');
export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npx tsx backend/src/tests/e2e-server.ts',
      url: 'http://127.0.0.1:3000/api/health',
      timeout: 180000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://127.0.0.1:4200',
      timeout: 180000,
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    {
      name: 'mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
