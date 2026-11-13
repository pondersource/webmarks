const Armadietto = require('armadietto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const directory = mkdtempSync(join(tmpdir(), 'webmarks-acceptance-'));
process.on('exit', () => rmSync(directory, { recursive: true, force: true }));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

new Armadietto({
  store: new Armadietto.FileTree({ path: directory }),
  http: { host: '127.0.0.1', port: 8112 },
  https: {},
  allow: { signup: true },
  logging: { stdout: ['error'], log_files: [] },
}).boot();
