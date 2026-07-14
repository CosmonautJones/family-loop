import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [url, environmentId, expectedText] = process.argv.slice(2);
if (!url || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(environmentId ?? '') || !expectedText) {
  throw new Error('Usage: node scripts/check-runtime-config-browser.mjs <url> <environment-id> <expected-text>');
}

const profile = mkdtempSync(join(tmpdir(), 'loopedin-runtime-config-'));
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--dump-dom', '--virtual-time-budget=5000',
  `--user-data-dir=${profile}`, url,
], { windowsHide: true });
let html = '';
let error = '';
child.stdout.on('data', (chunk) => { html += chunk; });
child.stderr.on('data', (chunk) => { error += chunk; });
const exitCode = await new Promise((resolveExit, rejectExit) => {
  child.on('error', rejectExit);
  child.on('exit', resolveExit);
});

try {
  if (exitCode !== 0) throw new Error(`Chrome runtime-config smoke failed (${exitCode}): ${error.slice(-300)}`);
  const normalized = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!normalized.includes(environmentId) || !normalized.includes(expectedText)) {
    throw new Error('Runtime-config browser smoke did not render the expected environment and state.');
  }
  process.stdout.write(`Runtime browser state: ${environmentId} / ${expectedText}: PASS\n`);
} finally {
  const resolvedProfile = resolve(profile);
  if (resolvedProfile.startsWith(resolve(tmpdir()))) {
    try { rmSync(resolvedProfile, { recursive: true, force: true }); } catch (cleanupError) {
      if (cleanupError.code !== 'EBUSY') throw cleanupError;
    }
  }
}
