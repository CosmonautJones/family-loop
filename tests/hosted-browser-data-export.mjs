import assert from 'node:assert/strict';
import crypto, { webcrypto } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const APP_ORIGIN = 'https://loopedin-family.netlify.app';
const EXPECTED_RELEASE = '0.1.0-a45838479634';
const EXPECTED_ENVIRONMENT = 'loopedin-staging';
const EXPECTED_BACKEND = 'https://vkogznsfthirhxkqysza.supabase.co';
const CHROME_PATH = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const fromBase64 = (value) => Uint8Array.from(Buffer.from(value, 'base64'));

async function sha256Base64(value) {
  return Buffer.from(await webcrypto.subtle.digest('SHA-256', value)).toString('base64');
}

async function decrypt(bundle, passphrase) {
  assert.equal(bundle.format, 'loopedin-encrypted-user-export');
  assert.equal(bundle.version, 1);
  assert.deepEqual({ name: bundle.kdf.name, hash: bundle.kdf.hash, iterations: bundle.kdf.iterations }, {
    name: 'PBKDF2', hash: 'SHA-256', iterations: 310_000,
  });
  assert.equal(bundle.cipher.name, 'AES-GCM');
  const ciphertext = fromBase64(bundle.ciphertextBase64);
  assert.equal(await sha256Base64(ciphertext), bundle.ciphertextSha256, 'ciphertext digest');
  const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: bundle.kdf.iterations, salt: fromBase64(bundle.kdf.saltBase64) },
    material,
    { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  const plaintext = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(bundle.cipher.ivBase64) }, key, ciphertext,
  );
  const parsed = JSON.parse(new TextDecoder().decode(plaintext));
  assert.equal(await sha256Base64(new TextEncoder().encode(JSON.stringify(parsed.data))), parsed.manifest.dataSha256, 'plaintext digest');
  return parsed;
}

async function verifyHostedRelease() {
  const shell = await fetch(`${APP_ORIGIN}/`, { redirect: 'error' });
  assert.equal(shell.status, 200, 'hosted export shell unavailable');
  assert.equal(shell.headers.get('x-loopedin-release'), EXPECTED_RELEASE, 'hosted export release mismatch');
  assert.equal(shell.headers.get('x-loopedin-environment'), EXPECTED_ENVIRONMENT, 'hosted export environment mismatch');
  const runtimeResponse = await fetch(`${APP_ORIGIN}/runtime-config.json`, { cache: 'no-store' });
  assert.equal(runtimeResponse.status, 200, 'hosted export runtime unavailable');
  assert.match(runtimeResponse.headers.get('cache-control') ?? '', /no-store/i);
  const runtime = await runtimeResponse.json();
  assert.equal(runtime.environmentId, EXPECTED_ENVIRONMENT);
  assert.equal(runtime.supabaseUrl, EXPECTED_BACKEND);
  assert.match(runtime.supabasePublishableKey, /^sb_publishable_/);
}

async function runAccount(account) {
  const profile = mkdtempSync(join(tmpdir(), 'loopedin-hosted-export-'));
  const downloads = join(profile, 'downloads');
  const passphrase = `${crypto.randomBytes(32).toString('base64url')}Aa1!`;
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let socket;
  let sequence = 0;
  const pending = new Map();
  const consoleEvents = [];
  const failedRequests = [];
  let stage = 'launch';
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
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) consoleEvents.push(message.params.type);
      if (message.method === 'Network.loadingFailed') failedRequests.push(message.params.errorText);
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
    const eventually = async (predicate, label, timeout = 45_000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (await predicate()) return;
        await delay(100);
      }
      throw new Error(`Timed out: ${label}`);
    };
    const fill = (id, value) => evaluate(`(() => { const element=document.getElementById(${JSON.stringify(id)}); if(!element)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
    const clickText = (text) => evaluate(`(() => { const element=[...document.querySelectorAll('button,[role=button],[role=tab]')].find((item)=>item.textContent?.trim()===${JSON.stringify(text)}); if(!element)return false; element.click(); return true; })()`);

    await command('Page.enable');
    await command('Runtime.enable');
    await command('Network.enable');
    await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: APP_ORIGIN });
    stage = 'sign-in';
    await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'hosted sign-in form');
    assert.equal(await fill('auth-email', account.email), true, 'hosted email input unavailable');
    assert.equal(await fill('auth-password', account.password), true, 'hosted password input unavailable');
    assert.equal(await clickText('Sign in'), true, 'hosted sign-in action unavailable');
    await eventually(async () => !(await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'hosted authenticated state');
    stage = 'open-export';
    if (account.surface === 'family') {
      await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Family'), 'hosted family tab');
      assert.equal(await clickText('Family'), true, 'hosted family tab unavailable');
      await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Download your data'), 'hosted family export card');
    } else {
      await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Start with your family')
        && (await evaluate('document.body?.innerText'))?.includes('Download your data'), 'hosted outsider export card');
    }
    stage = 'layout';
    const layout = await evaluate(`(() => { const input=document.getElementById('export-passphrase'); const button=[...document.querySelectorAll('button,[role=button]')].find((item)=>item.textContent?.includes('Download encrypted export')); input?.focus(); return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,inputHeight:Math.round(input?.getBoundingClientRect().height??0),buttonHeight:Math.round(button?.getBoundingClientRect().height??0),focused:document.activeElement===input}; })()`);
    assert.deepEqual(layout, { width: 390, scrollWidth: 390, inputHeight: 52, buttonHeight: 48, focused: true });
    stage = 'mismatch-validation';
    assert.equal(await fill('export-passphrase', passphrase), true, 'hosted export passphrase input unavailable');
    assert.equal(await fill('export-passphrase-confirmation', `${passphrase}x`), true, 'hosted export confirmation input unavailable');
    assert.equal(await clickText('Download encrypted export'), true, 'hosted export action unavailable');
    await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('The passphrases do not match.'), 'hosted mismatch validation');
    assert.equal(await evaluate(`document.getElementById('export-passphrase')?.value === ${JSON.stringify(passphrase)}`), true, 'hosted retry retained passphrase');
    assert.equal(await fill('export-passphrase-confirmation', passphrase), true, 'hosted export retry confirmation unavailable');
    assert.equal(await clickText('Download encrypted export'), true, 'hosted export retry action unavailable');
    stage = 'download';
    await eventually(async () => existsSync(downloads)
      && readdirSync(downloads).some((name) => name.endsWith('.loopedin') && !name.endsWith('.crdownload')), 'hosted export download', 60_000);
    const filename = readdirSync(downloads).find((name) => name.endsWith('.loopedin'));
    const bundle = JSON.parse(readFileSync(join(downloads, filename), 'utf8'));
    stage = 'decrypt-and-validate';
    const plaintext = await decrypt(bundle, passphrase);
    assert.equal(plaintext.data.account.userId, account.userId);
    assert.equal(plaintext.data.scope, 'current-account-contributions');
    for (const item of plaintext.data.createdEvents) {
      assert.equal(item.creatorId === account.userId && !('coverUri' in item) && !('media' in item), true, 'created event ownership or fields');
    }
    for (const item of plaintext.data.rsvps) assert.equal(item.personId === account.userId, true, 'RSVP ownership');
    for (const item of plaintext.data.messages) assert.equal(item.authorId === account.userId, true, 'message ownership');
    for (const item of plaintext.data.media) {
      assert.equal(item.uploadedBy === account.userId && !('uri' in item), true, 'media ownership or fields');
    }
    for (const item of plaintext.data.reminders) assert.equal(item.userId === account.userId, true, 'reminder ownership');
    for (const item of plaintext.data.media.filter((media) => media.file)) {
      const bytes = Buffer.from(item.file.bytesBase64, 'base64');
      assert.equal(bytes.byteLength, item.file.byteLength);
      assert.equal(await sha256Base64(bytes), item.file.sha256);
    }
    const counts = plaintext.manifest.counts;
    assert.deepEqual(counts, {
      memberships: plaintext.data.memberships.length,
      createdEvents: plaintext.data.createdEvents.length,
      rsvps: plaintext.data.rsvps.length,
      messages: plaintext.data.messages.length,
      media: plaintext.data.media.length,
      mediaFiles: plaintext.data.media.filter((item) => item.file).length,
      unavailableMediaFiles: plaintext.data.media.filter((item) => !item.file).length,
      reminders: plaintext.data.reminders.length,
    });
    assert.deepEqual(counts, account.expectedCounts, 'unexpected current-account contribution counts');
    const serialized = JSON.stringify(plaintext);
    assert.equal(/@loopedin\.invalid|X-Amz-|token=|signature=|sb_(?:publishable|secret)_|https?:\/\//i.test(serialized), false, 'sensitive export field');
    stage = 'negative-crypto';
    await assert.rejects(decrypt(bundle, 'wrong hosted export passphrase'));
    const tampered = structuredClone(bundle);
    tampered.ciphertextBase64 = `${tampered.ciphertextBase64.slice(0, -2)}AA`;
    await assert.rejects(decrypt(tampered, passphrase));
    stage = 'browser-signals';
    assert.deepEqual(consoleEvents, []);
    assert.deepEqual(failedRequests, []);
    return plaintext.data;
  } catch {
    throw new Error(`hosted export browser proof failed during ${stage}`);
  } finally {
    socket?.close();
    chrome.kill();
    await delay(500);
    rmSync(profile, { recursive: true, force: true });
  }
}

export async function proveHostedEncryptedExports({ accounts, expectedMediaBytes, syntheticUserIds }) {
  assert.equal(accounts.length, 3, 'hosted export proof requires owner, photo owner, and outsider');
  assert.equal(syntheticUserIds.length, 4, 'hosted export proof requires all four synthetic user IDs');
  assert.equal(new Set(syntheticUserIds).size, 4, 'synthetic user IDs must be distinct');
  assert.ok(existsSync(CHROME_PATH), 'Chrome executable is unavailable');
  await verifyHostedRelease();
  const exports = [];
  for (const account of accounts) exports.push(await runAccount(account));
  const ids = exports.map((item) => item.account.userId);
  assert.equal(new Set(ids).size, 3, 'export account IDs must be distinct');
  for (let index = 0; index < exports.length; index += 1) {
    const serialized = JSON.stringify(exports[index]);
    for (const userId of syntheticUserIds) if (userId !== ids[index]) {
      assert.equal(serialized.toLowerCase().includes(userId.toLowerCase()), false, 'foreign synthetic user ID leaked into export');
    }
  }
  assert.equal(exports[2].memberships.length, 0, 'outsider memberships');
  assert.equal(exports[2].createdEvents.length, 0, 'outsider created events');
  assert.equal(exports[2].rsvps.length, 0, 'outsider RSVPs');
  assert.equal(exports[2].messages.length, 0, 'outsider messages');
  assert.equal(exports[2].media.length, 0, 'outsider media');
  assert.equal(exports[2].reminders.length, 0, 'outsider reminders');
  const photoFiles = exports[1].media.filter((item) => item.file).map((item) => Buffer.from(item.file.bytesBase64, 'base64'));
  assert.equal(photoFiles.length, 1, 'photo owner export must contain one private file');
  assert.equal(await sha256Base64(photoFiles[0]), await sha256Base64(expectedMediaBytes), 'hosted private file hash');
  return { accountCount: exports.length, outsiderEmpty: true, privateMediaFiles: photoFiles.length };
}
