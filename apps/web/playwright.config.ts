import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({
    path: resolve(process.cwd(), '.env.test'),
});

const DEBUG = process.argv.includes('--debug');
const PORT = process.env.PORT || 3000;

const baseURL = `http://localhost:${PORT}`;

if (DEBUG) console.log(JSON.stringify({ DEBUG, PORT, baseURL }, null, 2));

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    // testDir: './tests',
    testMatch: /.*\.spec\.ts/,

    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('')`. */
        baseURL,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Run your local dev server before starting the tests */
    webServer: {
        command:
            'NODE_ENV=test pnpm payload run tests/_setup.ts && NODE_ENV=test pnpm exec next dev',
        url: baseURL,
        timeout: 30 * 1000,
        reuseExistingServer: !process.env.CI,
        stderr: DEBUG ? 'pipe' : 'ignore',
        stdout: DEBUG ? 'pipe' : 'ignore',
    },

    globalTeardown: resolve(process.cwd(), 'tests/_global-teardown.ts'),

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] },
        // },

        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },

        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },

        /* Test against branded browsers. */
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
    ],
});
