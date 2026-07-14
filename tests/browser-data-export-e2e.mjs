import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';

const appOrigin = process.env.LOOPEDIN_WEB_URL ?? 'http://127.0.0.1:8090';
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(password, 'The local browser password is required.');
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin), 'The browser export proof only runs on loopback.');

const passphrase = 'Family export proof 42!';
const accounts = [
  { email: `browser-owner-${marker}@loopedin.test`, surface: 'family' },
  { email: `browser-maya-${marker}@loopedin.test`, surface: 'family' },
  { email: `browser-outsider-${marker}@loopedin.test`, surface: 'onboarding' },
];
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const fromBase64 = (value) => Uint8Array.from(Buffer.from(value, 'base64'));

async function decrypt(bundle, secret) {
  const ciphertext = fromBase64(bundle.ciphertextBase64);
  const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', ciphertext)).toString('base64');
  assert.equal(digest, bundle.ciphertextSha256, 'ciphertext digest');
  const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: bundle.kdf.iterations, salt: fromBase64(bundle.kdf.saltBase64) }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(bundle.cipher.ivBase64) }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function runAccount(account) {
  const profile = mkdtempSync(join(tmpdir(), 'loopedin-export-browser-'));
  const downloads = join(profile, 'downloads');
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let socket;
  let sequence = 0;
  const pending = new Map();
  const consoleEvents = [];
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(50);
    assert.ok(existsSync(portFile), 'Chrome DevTools port');
    const port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.method === 'Runtime.consoleAPICalled') consoleEvents.push(message.params.type);
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message)); else handlers.resolve(message.result);
    };
    const command = (method, params = {}) => {
      const id = ++sequence;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    };
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const eventually = async (predicate, label, timeout = 30_000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (await predicate()) return;
        await delay(100);
      }
      throw new Error(`Timed out: ${label}\n${String(await evaluate('document.body?.innerText')).slice(0, 1_000)}`);
    };
    const fill = (id, value) => evaluate(`(() => { const element=document.getElementById(${JSON.stringify(id)}); if(!element)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
    const clickText = (text) => evaluate(`(() => { const element=[...document.querySelectorAll('button,[role=button],[role=tab]')].find((item)=>item.textContent?.trim()===${JSON.stringify(text)}); if(!element)return false; element.click(); return true; })()`);

    await command('Page.enable');
    await command('Runtime.enable');
    await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: appOrigin });
    await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'sign-in form');
    assert.equal(await fill('auth-email', account.email), true);
    assert.equal(await fill('auth-password', password), true);
    assert.equal(await clickText('Sign in'), true);
    await eventually(async () => !(await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'authenticated state');
    if (account.surface === 'family') {
      assert.equal(await clickText('Family'), true);
      await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Download your data'), 'family export card');
    } else {
      await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Start with your family') && (await evaluate('document.body?.innerText'))?.includes('Download your data'), 'no-family export card');
    }
    const layout = await evaluate(`(() => { const first=document.getElementById('export-passphrase'); const button=[...document.querySelectorAll('button,[role=button]')].find((item)=>item.textContent?.includes('Download encrypted export')); const inputRect=first?.getBoundingClientRect(); const buttonRect=button?.getBoundingClientRect(); first?.focus(); return { width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, inputHeight:inputRect?.height, buttonHeight:buttonRect?.height, focused:document.activeElement===first }; })()`);
    assert.deepEqual(layout, { width: 390, scrollWidth: 390, inputHeight: 52, buttonHeight: 48, focused: true });

    assert.equal(await fill('export-passphrase', passphrase), true);
    assert.equal(await fill('export-passphrase-confirmation', `${passphrase}x`), true);
    assert.equal(await clickText('Download encrypted export'), true);
    await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('The passphrases do not match.'), 'mismatch is visible');
    assert.equal(await evaluate("document.getElementById('export-passphrase')?.value"), passphrase, 'retry retains passphrase');
    assert.equal(await fill('export-passphrase-confirmation', passphrase), true);
    assert.equal(await clickText('Download encrypted export'), true);
    await eventually(async () => existsSync(downloads) && readdirSync(downloads).some((name) => name.endsWith('.loopedin') && !name.endsWith('.crdownload')), 'actual export download', 60_000);
    const filename = readdirSync(downloads).find((name) => name.endsWith('.loopedin'));
    const bundle = JSON.parse(readFileSync(join(downloads, filename), 'utf8'));
    const plaintext = await decrypt(bundle, passphrase);
    assert.equal(plaintext.data.account.userId.length > 0, true);
    assert.ok(plaintext.data.createdEvents.every((item) => item.creatorId === plaintext.data.account.userId));
    assert.ok(plaintext.data.rsvps.every((item) => item.personId === plaintext.data.account.userId));
    assert.ok(plaintext.data.messages.every((item) => item.authorId === plaintext.data.account.userId));
    assert.ok(plaintext.data.media.every((item) => item.uploadedBy === plaintext.data.account.userId && !('uri' in item)));
    for (const item of plaintext.data.media.filter((media) => media.file)) {
      assert.equal(Buffer.from(item.file.bytesBase64, 'base64').byteLength, item.file.byteLength);
      assert.equal(Buffer.from(await webcrypto.subtle.digest('SHA-256', Buffer.from(item.file.bytesBase64, 'base64'))).toString('base64'), item.file.sha256);
    }
    assert.ok(plaintext.data.reminders.every((item) => item.userId === plaintext.data.account.userId));
    assert.equal(plaintext.manifest.counts.memberships, plaintext.data.memberships.length);
    assert.equal(plaintext.manifest.counts.createdEvents, plaintext.data.createdEvents.length);
    assert.equal(plaintext.manifest.counts.rsvps, plaintext.data.rsvps.length);
    assert.equal(plaintext.manifest.counts.messages, plaintext.data.messages.length);
    assert.equal(plaintext.manifest.counts.media, plaintext.data.media.length);
    assert.equal(plaintext.manifest.counts.mediaFiles, plaintext.data.media.filter((item) => item.file).length);
    assert.equal(plaintext.manifest.counts.unavailableMediaFiles, plaintext.data.media.filter((item) => !item.file).length);
    assert.equal(plaintext.manifest.counts.reminders, plaintext.data.reminders.length);
    assert.doesNotMatch(JSON.stringify(plaintext), /X-Amz-|token=|signature=/i);
    await assert.rejects(decrypt(bundle, 'wrong export passphrase'));
    const tampered = structuredClone(bundle);
    tampered.ciphertextBase64 = `${tampered.ciphertextBase64.slice(0, -2)}AA`;
    await assert.rejects(decrypt(tampered, passphrase));
    assert.deepEqual(consoleEvents, []);
    return plaintext.data;
  } finally {
    socket?.close();
    chrome.kill();
    await delay(500);
    rmSync(profile, { recursive: true, force: true });
  }
}

const exports = [];
for (const account of accounts) exports.push(await runAccount(account));
const ids = exports.map((item) => item.account.userId);
assert.equal(new Set(ids).size, 3);
for (let index = 0; index < exports.length; index += 1) {
  const plaintext = JSON.stringify(exports[index]);
  for (let other = 0; other < ids.length; other += 1) if (other !== index) assert.doesNotMatch(plaintext, new RegExp(ids[other], 'i'));
}
assert.deepEqual(exports[2].memberships, []);
assert.deepEqual(exports[2].createdEvents, []);
assert.deepEqual(exports[2].rsvps, []);
assert.deepEqual(exports[2].messages, []);
assert.deepEqual(exports[2].media, []);
assert.ok(exports.slice(0, 2).flatMap((item) => item.media).some((item) => item.file !== null), 'configured member exports must include at least one owned media file');
console.log(`Configured encrypted export browser PASS: users=${exports.length}; outsiderEmpty=true; width=390; controls=52/48; mismatchRetry=retained; wrongPassphrase=denied; tamper=denied; console=0`);
