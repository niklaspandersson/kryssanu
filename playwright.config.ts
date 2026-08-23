import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 3000;
const API_PORT = 3001;
const BASE_URL = `http://localhost:${WEB_PORT}`;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'mysql://root:kryssanutest@127.0.0.1:3307/kryssanu_test';

export default defineConfig({
  testDir: './e2e',
  // Fail the run if a spec was committed with .only.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The API is PHP's built-in server, which handles one request at a time.
  // PHP_CLI_SERVER_WORKERS (set below) is the lever to raise this later.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The app asks for a position as soon as the quick-add sheet opens. Pinning
    // it makes the reverse-geocode path deterministic instead of a race.
    geolocation: { latitude: 57.7826, longitude: 14.1618 }, // Jönköping
    permissions: ['geolocation'],
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Two entries rather than `npm run dev`, which health-checks neither process.
  webServer: [
    {
      command: `php -S 127.0.0.1:${API_PORT} -t packages/server-php/public packages/server-php/public/app.php`,
      // Counting Bird rows proves the DB is reachable and the schema exists,
      // which is exactly what "the API is ready" has to mean here. Provisioning
      // runs before Playwright starts (npm run test:db:provision), so the table
      // is already populated by this point.
      url: `http://127.0.0.1:${API_PORT}/api/birds/version`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL,
        // app.php exit(1)s if this is empty. Never used: the suite authenticates
        // via /api/auth/dev-login, not Google.
        GOOGLE_CLIENT_ID: 'e2e-not-a-real-client-id',
        // Anything but 'production', or /api/auth/dev-login is not registered.
        APP_ENV: 'test',
        PHP_CLI_SERVER_WORKERS: '4',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // Shrinks the hung-request timeout in src/lib/api.ts so the offline
        // regression spec takes ~2s instead of ~16s. Production keeps 15000.
        VITE_REQUEST_TIMEOUT_MS: '2000',
      },
    },
  ],
});
