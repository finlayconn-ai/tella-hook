/**
 * Playwright configuration for testing Tella Extension
 */

module.exports = {
  testDir: './',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  use: {
    headless: false,
    channel: 'chrome', // Use Chrome to support extensions
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        channel: 'chrome',
      },
    },
  ],
};

