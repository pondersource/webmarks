const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:8107',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm start -- --host 127.0.0.1 --port 8107',
      cwd: '../..',
      url: 'http://127.0.0.1:8107',
      timeout: 120_000,
    },
    {
      command: 'node storage-server.cjs',
      url: 'http://127.0.0.1:8112',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
});
