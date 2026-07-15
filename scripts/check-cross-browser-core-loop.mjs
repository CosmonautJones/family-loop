import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { safeConsoleText, safeUrl } from './browser-evidence-safety.mjs';

const browserName = process.argv[2];
const baseUrl = new URL(process.argv[3] ?? 'http://127.0.0.1:8091');
const evidenceDir = resolve(process.argv[4] ?? `.codex/evidence/cross-browser/${browserName}`);
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const backendUrl = process.env.LOOPEDIN_BACKEND_URL;
const edgePath = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const firefoxPath = process.env.FIREFOX_PATH ?? 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
const sourceRevision = process.env.LOOPEDIN_SOURCE_REVISION ?? 'working-tree-precommit';

assert.ok(['edge', 'firefox'].includes(browserName), 'Usage: node scripts/check-cross-browser-core-loop.mjs <edge|firefox> <loopback-app-url> [evidence-dir]');
assert.ok(password, 'LOOPEDIN_LOCAL_PASSWORD is required.');
assert.ok(backendUrl, 'LOOPEDIN_BACKEND_URL is required.');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname), 'The app must be served from loopback.');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(backendUrl).hostname), 'The backend must be loopback.');
assert.match(marker, /^[a-z0-9][a-z0-9-]{2,39}$/);
assert.match(sourceRevision, /^(?:[0-9a-f]{40}|working-tree-precommit)$/);
mkdirSync(evidenceDir, { recursive: true });

const accounts = {
  owner: `browser-owner-${marker}@loopedin.test`,
  member: `browser-maya-${marker}@loopedin.test`,
  outsider: `browser-outsider-${marker}@loopedin.test`,
};

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

class RpcSocket {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', rejectOpen, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error}: ${message.message ?? ''}`));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, rejectSend) => this.pending.set(id, { resolve: resolveSend, reject: rejectSend }));
  }

  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), listener]);
  }
}

async function waitForPort(port, label) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {}
    await delay(50);
  }
  throw new Error(`${label} remote endpoint did not become ready.`);
}

async function launchEdge(profile) {
  const process = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200 && !existsSync(portFile); attempt += 1) await delay(50);
  assert.ok(existsSync(portFile), 'Edge DevTools port did not become ready.');
  const port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  const rpc = new RpcSocket(target.webSocketDebuggerUrl);
  await rpc.open();
  await Promise.all([rpc.send('Page.enable'), rpc.send('Runtime.enable'), rpc.send('Network.enable')]);
  const failures = [];
  const httpErrors = [];
  const consoleEvents = [];
  const requests = new Map();
  rpc.on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error' || event.type === 'warning') consoleEvents.push({ type: event.type, text: safeConsoleText(event.args.map((item) => item.value ?? item.description).join(' ')) });
  });
  rpc.on('Runtime.exceptionThrown', (event) => consoleEvents.push({ type: 'exception', text: safeConsoleText(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text) }));
  rpc.on('Network.requestWillBeSent', (event) => requests.set(event.requestId, event.request.url));
  rpc.on('Network.loadingFailed', (event) => {
    if (!event.canceled) failures.push({ url: safeUrl(requests.get(event.requestId) ?? ''), error: safeConsoleText(event.errorText), type: event.type, blockedReason: event.blockedReason });
  });
  rpc.on('Network.responseReceived', (event) => { if (event.response.status >= 400) httpErrors.push({ url: safeUrl(event.response.url), status: event.response.status }); });
  return {
    processId: process.pid,
    browser: await rpc.send('Browser.getVersion'),
    consoleEvents,
    failures,
    httpErrors,
    async setViewport(width, height) { await rpc.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true }); },
    async navigate(url) { await rpc.send('Page.navigate', { url }); },
    async reload() { await rpc.send('Page.reload', { ignoreCache: true }); },
    async evaluate(expression) {
      const result = await rpc.send('Runtime.evaluate', { expression: `JSON.stringify((${expression}) ?? null)`, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return JSON.parse(result.result.value);
    },
    async screenshot(path) {
      const capture = await rpc.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      writeFileSync(path, Buffer.from(capture.data, 'base64'));
    },
    async close() {
      rpc.socket.close();
      process.kill();
      await Promise.race([once(process, 'exit'), delay(500)]);
    },
  };
}

async function launchFirefox(profile) {
  const port = await freePort();
  const process = spawn(firefoxPath, [
    '--no-remote',
    '--headless',
    '--remote-debugging-port', String(port),
    '--profile', profile,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  await waitForPort(port, 'Firefox BiDi');
  const rpc = new RpcSocket(`ws://127.0.0.1:${port}/session`);
  await rpc.open();
  const created = await rpc.send('session.new', { capabilities: { alwaysMatch: { browserName: 'firefox' } } });
  const tree = await rpc.send('browsingContext.getTree', {});
  const context = tree.contexts[0].context;
  const failures = [];
  const httpErrors = [];
  const consoleEvents = [];
  await rpc.send('session.subscribe', { events: ['log.entryAdded', 'network.fetchError', 'network.responseCompleted'], contexts: [context] });
  rpc.on('log.entryAdded', (event) => {
    if (event.level === 'error' || event.level === 'warn') consoleEvents.push({ type: event.level, text: safeConsoleText(event.text ?? '') });
  });
  rpc.on('network.fetchError', (event) => failures.push({ url: safeUrl(event.request?.url ?? ''), error: safeConsoleText(event.errorText ?? 'fetch error') }));
  rpc.on('network.responseCompleted', (event) => { if (event.response.status >= 400) httpErrors.push({ url: safeUrl(event.response.url), status: event.response.status }); });
  return {
    processId: process.pid,
    browser: created.capabilities,
    consoleEvents,
    failures,
    httpErrors,
    async setViewport(width, height) { await rpc.send('browsingContext.setViewport', { context, viewport: { width, height }, devicePixelRatio: 1 }); },
    async navigate(url) { await rpc.send('browsingContext.navigate', { context, url, wait: 'complete' }); },
    async reload() { await rpc.send('browsingContext.reload', { context, wait: 'complete' }); },
    async evaluate(expression) {
      const result = await rpc.send('script.evaluate', { expression: `JSON.stringify((${expression}) ?? null)`, target: { context }, awaitPromise: true });
      if (result.type !== 'success') throw new Error(result.exceptionDetails?.text ?? 'Firefox script evaluation failed.');
      return JSON.parse(result.result.value);
    },
    async screenshot(path) {
      const capture = await rpc.send('browsingContext.captureScreenshot', { context, origin: 'viewport', format: { type: 'image/png' } });
      writeFileSync(path, Buffer.from(capture.data, 'base64'));
    },
    async close() {
      try { await rpc.send('session.end', {}); } catch {}
      rpc.socket.close();
      process.kill();
      await Promise.race([once(process, 'exit'), delay(500)]);
    },
  };
}

async function waitUntil(browser, expression, message, attempts = 300) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await browser.evaluate(expression)) return;
    await delay(50);
  }
  const diagnostic = await browser.evaluate("({ hash: location.hash, text: document.body?.innerText.slice(0, 1200) })");
  throw new Error(`${message}: ${JSON.stringify(diagnostic)}`);
}

const waitForText = (browser, text) => waitUntil(browser, `document.body?.innerText.includes(${JSON.stringify(text)})`, `Timed out waiting for ${text}`);

async function clickText(browser, label) {
  const clicked = await browser.evaluate(`(() => {
    const element = [...document.querySelectorAll('button,[role="button"],[role="tab"]')]
      .find((item) => (item.getAttribute('aria-label') ?? item.textContent)?.trim() === ${JSON.stringify(label)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    element.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Could not find action: ${label}`);
}

async function fill(browser, id, value) {
  const filled = await browser.evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  assert.equal(filled, true, `Could not fill ${id}.`);
}

async function auditLayout(browser, label, width, authenticatedShell = false) {
  const audit = await browser.evaluate(`(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const controls = [...document.querySelectorAll('button,[role="button"],[role="tab"],[role="switch"],input,textarea')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 80), left: rect.left, right: rect.right, height: rect.height, width: rect.width };
      });
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      mainCount: document.querySelectorAll('main,[role="main"]').length,
      tabs: document.querySelectorAll('[role="tab"]').length,
      selectedTabs: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
      controls,
    };
  })()`);
  assert.ok(Math.abs(audit.clientWidth - width) <= 1, `${label} rendered ${audit.clientWidth}px instead of ${width}px.`);
  assert.equal(audit.scrollWidth, audit.clientWidth, `${label} has document overflow.`);
  assert.equal(audit.bodyScrollWidth, audit.clientWidth, `${label} has body overflow.`);
  assert.ok(audit.mainCount <= 1, `${label} exposes duplicate main landmarks.`);
  if (authenticatedShell) {
    assert.equal(audit.tabs, 5, `${label} authenticated shell must expose exactly five tabs.`);
    assert.equal(audit.selectedTabs, 1, `${label} authenticated shell must expose one selected tab.`);
    assert.equal(audit.mainCount, 1, `${label} authenticated shell must expose one main landmark.`);
  }
  assert.ok(audit.controls.every((item) => item.height >= 48 && item.width >= 48), `${label} has a control below 48px: ${JSON.stringify(audit.controls.filter((item) => item.height < 48 || item.width < 48))}`);
  assert.ok(audit.controls.every((item) => item.left >= -1 && item.right <= audit.clientWidth + 1), `${label} has a clipped control.`);
  return { label, ...audit };
}

async function signIn(browser, email) {
  await fill(browser, 'auth-email', email);
  await fill(browser, 'auth-password', password);
  await clickText(browser, 'Sign in');
  await waitForText(browser, email === accounts.outsider ? 'Join a family' : 'Jones Family');
}

async function signedOutMatrix(browser, record) {
  await waitForText(browser, 'Welcome back');
  record.screens.push(await auditLayout(browser, 'signed-out auth', record.width));
  await clickText(browser, 'Sign in');
  await waitForText(browser, 'Enter your email and password.');
  const focus = await browser.evaluate("({ id: document.activeElement?.id, invalid: document.getElementById('auth-email')?.getAttribute('aria-invalid'), describedBy: document.getElementById('auth-email')?.getAttribute('aria-describedby') })");
  assert.deepEqual(focus, { id: 'auth-email', invalid: 'true', describedBy: 'auth-error' });
  await clickText(browser, 'Forgot password?');
  await waitForText(browser, 'Reset your password');
  record.screens.push(await auditLayout(browser, 'signed-out recovery', record.width));
}

async function ownerMatrix(browser, record) {
  await signIn(browser, accounts.owner);
  await waitForText(browser, 'New family comment');
  record.screens.push(await auditLayout(browser, 'owner Today', record.width, true));
  assert.equal(await browser.evaluate("document.body.innerText.includes('Updates')"), true, 'Owner Today does not expose updates.');
  await browser.screenshot(join(evidenceDir, `owner-today-${record.width}.png`));

  await clickText(browser, 'Calendar');
  await waitForText(browser, 'Door County Cabin Weekend');
  record.screens.push(await auditLayout(browser, 'owner Calendar', record.width, true));

  await clickText(browser, 'Memories');
  await waitForText(browser, 'Lake Geneva Family Reunion');
  await waitUntil(browser, `[...document.images].some((image) => image.src.startsWith(${JSON.stringify(new URL(backendUrl).origin)}) && image.complete && image.naturalWidth > 0)`, 'Private family photo did not render.');
  await delay(500);
  record.screens.push(await auditLayout(browser, 'owner Memories', record.width, true));
  await browser.screenshot(join(evidenceDir, `owner-memories-${record.width}.png`));
  await clickText(browser, 'Family');
  await waitForText(browser, 'Invite someone');
  assert.equal(await browser.evaluate("document.body.innerText.includes('Download your data') && document.body.innerText.includes('Transfer ownership')"), true, 'Owner family/invite/export controls are incomplete.');
  record.screens.push(await auditLayout(browser, 'owner Family', record.width, true));
  await browser.screenshot(join(evidenceDir, `owner-family-${record.width}.png`));
  await browser.reload();
  await waitForText(browser, 'Invite someone');
  assert.equal(await browser.evaluate("document.body.innerText.includes('Welcome back')"), false, 'Owner session did not restore after reload.');
  await delay(500);
  assert.deepEqual(browser.consoleEvents, [], `Family session reload surfaced a console error: ${JSON.stringify(browser.consoleEvents)}`);

  await clickText(browser, 'Calendar');
  await waitForText(browser, 'Door County Cabin Weekend');
  await clickText(browser, 'Open Door County Cabin Weekend');
  await waitForText(browser, 'Thread');
  await waitForText(browser, 'Cabin is booked.');
  await waitUntil(browser, "Boolean(document.querySelector('[role=\"switch\"]'))", 'Owner reminder preference did not finish loading.');
  record.eventHash = await browser.evaluate('location.hash');
  assert.ok(record.eventHash.startsWith('#/event/'), 'Calendar did not reach an exact event route.');
  const eventFeatures = await browser.evaluate(`({
    rsvp: ['Going', 'Maybe', "Can't go"].every((label) => [...document.querySelectorAll('button,[role="button"]')].some((item) => item.textContent?.trim() === label)),
    thread: document.body.innerText.includes('Thread'),
    photos: document.body.innerText.includes('Family photos stay with this plan.'),
    reminder: Boolean(document.querySelector('[role="switch"]')),
    edit: document.body.innerText.includes('Edit plan')
  })`);
  assert.deepEqual(eventFeatures, { rsvp: true, thread: true, photos: true, reminder: true, edit: true });
  record.screens.push(await auditLayout(browser, 'owner exact event', record.width, true));
  await browser.screenshot(join(evidenceDir, `owner-event-${record.width}.png`));
  await browser.evaluate('history.back()');
  await waitForText(browser, 'Door County Cabin Weekend');
  assert.equal(await browser.evaluate("location.hash.startsWith('#/calendar')"), true, 'Browser Back did not restore Calendar.');
  await browser.evaluate(`location.hash = ${JSON.stringify(record.eventHash)}`);
  await waitForText(browser, 'Thread');
  await waitForText(browser, 'Cabin is booked.');
  await delay(1000);
  await browser.reload();
  await waitForText(browser, 'Thread');
  await waitForText(browser, 'Cabin is booked.');
  assert.equal(await browser.evaluate(`location.hash === ${JSON.stringify(record.eventHash)}`), true, 'Deep-link reload did not retain the exact event.');
  await delay(500);
  assert.deepEqual(browser.consoleEvents, [], `Exact-event reload surfaced a console error: ${JSON.stringify(browser.consoleEvents)}`);
}

async function memberMatrix(browser, record) {
  await signIn(browser, accounts.member);
  await waitForText(browser, 'New family comment');
  record.screens.push(await auditLayout(browser, 'member Today', record.width, true));
  await clickText(browser, 'Family');
  await waitForText(browser, 'Leave family');
  assert.equal(await browser.evaluate("!document.body.innerText.includes('Invite someone') && document.body.innerText.includes('Download your data')"), true, 'Member family controls are not role-safe.');
  record.screens.push(await auditLayout(browser, 'member Family', record.width, true));
  await clickText(browser, 'Calendar');
  await waitForText(browser, 'Door County Cabin Weekend');
  await clickText(browser, 'Open Door County Cabin Weekend');
  await waitForText(browser, 'Thread');
  await waitForText(browser, 'Cabin is booked.');
  await waitUntil(browser, "Boolean(document.querySelector('[role=\"switch\"]'))", 'Member reminder preference did not finish loading.');
  const eventRole = await browser.evaluate(`({
    rsvp: ['Going', 'Maybe', "Can't go"].every((label) => [...document.querySelectorAll('button,[role="button"]')].some((item) => item.textContent?.trim() === label)),
    thread: document.body.innerText.includes('Thread'),
    reminder: Boolean(document.querySelector('[role="switch"]')),
    ownerEdit: document.body.innerText.includes('Edit plan')
  })`);
  assert.deepEqual(eventRole, { rsvp: true, thread: true, reminder: true, ownerEdit: false });
  record.screens.push(await auditLayout(browser, 'member role-safe event', record.width, true));
}

async function outsiderMatrix(browser, record, eventHash) {
  await signIn(browser, accounts.outsider);
  record.screens.push(await auditLayout(browser, 'outsider no-family', record.width));
  assert.equal(await browser.evaluate("document.body.innerText.includes('Join a family') && document.body.innerText.includes('Download your data') && !document.body.innerText.includes('Jones Family')"), true, 'Outsider boundary is incomplete.');
  await browser.evaluate(`location.hash = ${JSON.stringify(eventHash)}`);
  await waitForText(browser, 'Join a family');
  assert.equal(await browser.evaluate("!document.body.innerText.includes('Thread') && !document.body.innerText.includes('Door County Cabin Weekend')"), true, 'Outsider direct route exposed family content.');
}

function inScopeErrors(record) {
  return record.httpErrors.filter((item) => {
    try {
      const url = new URL(item.url);
      const inScope = url.origin === baseUrl.origin || url.origin === new URL(backendUrl).origin;
      return inScope && !(url.origin === baseUrl.origin && url.pathname === '/favicon.ico' && item.status === 404);
    } catch { return true; }
  });
}

async function run(role, width, shared) {
  const profile = mkdtempSync(join(tmpdir(), `loopedin-${browserName}-${role}-${width}-`));
  const record = { role, width, screens: [] };
  let browser;
  try {
    browser = browserName === 'edge' ? await launchEdge(profile) : await launchFirefox(profile);
    record.browser = browser.browser;
    await browser.setViewport(width, width === 430 ? 932 : 844);
    await browser.navigate(baseUrl.href);
    await waitForText(browser, 'Welcome back');
    if (role === 'signed-out') await signedOutMatrix(browser, record);
    if (role === 'owner') await ownerMatrix(browser, record);
    if (role === 'member') await memberMatrix(browser, record);
    if (role === 'outsider') await outsiderMatrix(browser, record, shared.eventHash);
    record.consoleEvents = browser.consoleEvents;
    record.failedRequests = browser.failures;
    record.httpErrors = inScopeErrors(browser);
    assert.deepEqual(record.consoleEvents, [], `${browserName} ${role}/${width} had console warnings/errors.`);
    assert.deepEqual(record.failedRequests, [], `${browserName} ${role}/${width} had failed requests.`);
    assert.deepEqual(record.httpErrors, [], `${browserName} ${role}/${width} had app/backend HTTP errors.`);
    if (record.eventHash) shared.eventHash = record.eventHash;
    return record;
  } finally {
    await browser?.close();
    if (process.platform === 'win32' && browser?.processId) spawnSync('taskkill', ['/PID', String(browser.processId), '/T', '/F'], { stdio: 'ignore' });
    for (let attempt = 0; attempt < 10 && existsSync(profile); attempt += 1) {
      try { rmSync(profile, { recursive: true, force: true }); }
      catch (error) {
        if (error.code !== 'EBUSY' && error.code !== 'EPERM') throw error;
        await delay(200);
      }
    }
    assert.equal(existsSync(profile), false, `Disposable ${browserName} profile remained locked.`);
  }
}

const shared = { eventHash: '' };
const evidence = { schemaVersion: 1, browserName, baseUrl: baseUrl.origin, marker, sourceRevision, matrices: [] };
evidence.matrices.push(await run('signed-out', 390, shared));
evidence.matrices.push(await run('owner', 390, shared));
evidence.matrices.push(await run('member', 390, shared));
evidence.matrices.push(await run('outsider', 390, shared));
evidence.matrices.push(await run('owner', 430, shared));
writeFileSync(join(evidenceDir, 'matrix.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${browserName} cross-browser core-loop PASS: roles=4; widths=390/430; signedOutRecovery=true; ownerCore=true; memberRoleSafe=true; outsiderDenied=true; deepLinkBackReload=true; minTargets=48; overflow=0; console=0; failedRequests=0; httpErrors=0`);
