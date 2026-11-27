// Runs every *.check.cjs in this folder (not *.test.*, so vitest/jest in the repo don't pick them up) with node:test. Works on Node 20 and later
// (`node --test <dir>` behaves differently across versions).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.check.cjs')).map((f) => path.join(__dirname, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
