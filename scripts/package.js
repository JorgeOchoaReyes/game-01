#!/usr/bin/env node
// Package the submission: assemble a clean staging folder with index.html at the
// TOP LEVEL and a vendor/ folder, then zip it. Verifies layout and size.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STAGE = path.join(ROOT, 'dist', 'ember');
const ZIP = path.join(ROOT, 'ember.zip');

// 1. Fresh build
execSync('node build.js', { cwd: ROOT, stdio: 'inherit' });

// 2. Clean staging dir
fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
fs.mkdirSync(path.join(STAGE, 'vendor'), { recursive: true });

// 3. Copy the exact files the game needs at runtime
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(STAGE, 'index.html'));
fs.copyFileSync(path.join(ROOT, 'vendor', 'README.txt'), path.join(STAGE, 'vendor', 'README.txt'));
fs.copyFileSync(path.join(ROOT, 'vendor', 'three.min.js'), path.join(STAGE, 'vendor', 'three.min.js'));

// 4. Zip (index.html must be at the top level of the archive)
fs.rmSync(ZIP, { force: true });
execSync(`cd "${STAGE}" && zip -r -X "${ZIP}" index.html vendor`, { stdio: 'inherit' });

// 5. Verify
const size = fs.statSync(ZIP).size;
const list = execSync(`unzip -l "${ZIP}"`).toString();
console.log('\n--- ember.zip contents ---');
console.log(list);
console.log(`Size: ${(size / 1024).toFixed(1)} KB  (limit 35 MB)`);
const topLevelIndex = /(^|\s)index\.html/m.test(list) && !/\/index\.html/.test(list);
console.log('index.html at top level:', topLevelIndex);
console.log('under 35MB:', size < 35 * 1024 * 1024);
if (!topLevelIndex || size >= 35 * 1024 * 1024) process.exit(1);
