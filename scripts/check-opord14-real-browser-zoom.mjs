import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const baseUrl = new URL(process.argv[2] ?? 'http://127.0.0.1:8089');
const evidenceDir = resolve(process.argv[3] ?? '.codex/evidence/opord14-real-zoom');
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const backendUrl = process.env.LOOPEDIN_BACKEND_URL;
const zoom200 = Math.log(2) / Math.log(1.2);

assert.ok(password, 'LOOPEDIN_LOCAL_PASSWORD is required.');
assert.ok(backendUrl, 'LOOPEDIN_BACKEND_URL is required.');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname), 'The app must be served from loopback.');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(backendUrl).hostname), 'The backend must be loopback.');
assert.match(marker, /^[a-z0-9][a-z0-9-]{2,39}$/);
mkdirSync(evidenceDir, { recursive: true });

const accounts = {
  owner: `browser-owner-${marker}@loopedin.test`,
  member: `browser-maya-${marker}@loopedin.test`,
  outsider: `browser-outsider-${marker}@loopedin.test`,
};

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForDebugPort(profile) {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (existsSync(portFile)) return Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become ready.');
}

class CdpSession {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', rejectOpen, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), listener]);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
}

async function waitUntil(session, expression, message, attempts = 200) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await session.evaluate(expression)) return;
    await delay(50);
  }
  const diagnostic = await session.evaluate("({ hash: location.hash, text: document.body.innerText.slice(0, 1200) })");
  throw new Error(`${message}: ${JSON.stringify(diagnostic)}`);
}

async function waitForText(session, text) {
  await waitUntil(session, `document.body.innerText.includes(${JSON.stringify(text)})`, `Timed out waiting for ${text}`);
}

async function clickText(session, label) {
  const point = await session.evaluate(`(() => {
    const element = [...document.querySelectorAll('[role="button"], button, [role="tab"]')]
      .find((item) => (item.getAttribute('aria-label') ?? item.textContent)?.trim() === ${JSON.stringify(label)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
  })()`);
  assert.ok(point, `Could not find action: ${label}`);
  assert.ok(point.height >= 48, `${label} is only ${point.height}px high.`);
  await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function fill(session, id, value) {
  const found = await session.evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  assert.equal(found, true, `Could not fill ${id}.`);
}

async function navigate(session, hash, expectedText) {
  await session.evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await waitForText(session, expectedText);
}

async function screenshot(session, name) {
  const result = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(evidenceDir, `${name}.png`), Buffer.from(result.data, 'base64'));
}

async function scrollTextIntoView(session, label) {
  const found = await session.evaluate(`(() => {
    const element = [...document.querySelectorAll('[role="button"], button, [role="tab"]')]
      .find((item) => (item.getAttribute('aria-label') ?? item.textContent)?.trim() === ${JSON.stringify(label)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  assert.equal(found, true, `Could not scroll to ${label}.`);
  await delay(100);
}

async function auditLayout(session, label, expectedCssWidth) {
  const audit = await session.evaluate(`(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const controls = [...document.querySelectorAll('[role="button"], button, [role="tab"], [role="switch"], input, textarea')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const glyphRects = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          glyphRects.push(...range.getClientRects());
        }
        const clippedGlyphs = glyphRects.filter((glyph) => glyph.left < rect.left - 1 || glyph.right > rect.right + 1 || glyph.top < rect.top - 1 || glyph.bottom > rect.bottom + 1);
        return {
          clippedGlyphs: clippedGlyphs.map((glyph) => ({ bottom: glyph.bottom, left: glyph.left, right: glyph.right, top: glyph.top })),
          glyphClipped: clippedGlyphs.length > 0,
          label: (element.getAttribute('aria-label') ?? element.textContent ?? element.id).trim().slice(0, 100),
          height: rect.height,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      });
    const headings = [...document.querySelectorAll('[role="heading"], h1, h2, h3')].filter(visible).map((item) => item.textContent?.trim());
    const nav = document.querySelector('[role="tablist"]')?.getBoundingClientRect();
    return {
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      controls,
      cssZoom: getComputedStyle(document.documentElement).zoom || '1',
      headings,
      innerHeight,
      innerWidth,
      nav: nav ? { bottom: nav.bottom, left: nav.left, right: nav.right, top: nav.top } : null,
      scrollWidth: document.documentElement.scrollWidth,
      viewportScale: visualViewport?.scale,
    };
  })()`);
  assert.ok(Math.abs(audit.innerWidth - expectedCssWidth) <= 1, `${label} rendered at ${audit.innerWidth}px, expected ${expectedCssWidth}px.`);
  assert.ok(audit.scrollWidth <= audit.clientWidth + 1 && audit.bodyScrollWidth <= audit.clientWidth + 1, `${label} has horizontal overflow.`);
  assert.ok(audit.controls.every((control) => control.left >= -1 && control.right <= audit.clientWidth + 1), `${label} has a clipped control: ${JSON.stringify(audit.controls.filter((control) => control.left < -1 || control.right > audit.clientWidth + 1))}`);
  assert.ok(audit.controls.every((control) => control.height >= 48), `${label} has a control below 48px: ${JSON.stringify(audit.controls.filter((control) => control.height < 48))}`);
  assert.ok(audit.controls.every((control) => !control.glyphClipped), `${label} has clipped control text: ${JSON.stringify(audit.controls.filter((control) => control.glyphClipped))}`);
  if (audit.nav) assert.ok(audit.nav.left >= 0 && audit.nav.right <= audit.clientWidth + 1 && audit.nav.bottom <= audit.innerHeight + 1, `${label} navigation is clipped.`);
  return { label, ...audit };
}

async function signIn(session, email) {
  await fill(session, 'auth-email', email);
  await fill(session, 'auth-password', password);
  await clickText(session, 'Sign in');
  await waitForText(session, email === accounts.outsider ? 'Join a family' : 'Jones Family');
}

async function signedOutMatrix(session, record, suffix) {
  await waitForText(session, 'Welcome back');
  record.screens.push(await auditLayout(session, 'signed-out auth', record.expectedCssWidth));
  await screenshot(session, `signed-out-${suffix}`);
  await clickText(session, 'Forgot password?');
  await waitForText(session, 'Reset your password');
  record.screens.push(await auditLayout(session, 'signed-out recovery request', record.expectedCssWidth));
  await clickText(session, 'Return to sign in');
  await waitForText(session, 'Welcome back');
}

async function sharedMemberMatrix(session, role, record, suffix) {
  await waitForText(session, 'Jones Family');
  record.screens.push(await auditLayout(session, `${role} Today`, record.expectedCssWidth));
  assert.equal(await session.evaluate("document.body.innerText.includes('Updates')"), true, `${role} cannot reach Updates.`);

  await clickText(session, 'Calendar');
  await waitForText(session, 'Review upcoming family plans.');
  record.screens.push(await auditLayout(session, `${role} Calendar`, record.expectedCssWidth));

  await clickText(session, 'Create');
  await waitForText(session, 'Plan something together');
  await clickText(session, 'Create family plan');
  await waitForText(session, 'Add a name so your family can recognize the plan.');
  assert.equal(await session.evaluate("document.activeElement?.id === 'create-title-input' && document.activeElement?.getAttribute('aria-invalid') === 'true'"), true, `${role} create validation did not focus the title.`);
  record.screens.push(await auditLayout(session, `${role} Create validation`, record.expectedCssWidth));

  await clickText(session, 'Memories');
  await waitForText(session, 'Family memories');
  record.screens.push(await auditLayout(session, `${role} Memories`, record.expectedCssWidth));

  await clickText(session, 'Family');
  await waitForText(session, 'Download your data');
  record.screens.push(await auditLayout(session, `${role} Family`, record.expectedCssWidth));
  assert.equal(await session.evaluate("Boolean(document.getElementById('export-passphrase') && document.getElementById('export-passphrase-confirmation'))"), true, `${role} export form is unreachable.`);
  await screenshot(session, `${role}-family-${suffix}`);
}

async function ownerEventMatrix(session, record, suffix) {
  await clickText(session, 'Home');
  await waitForText(session, 'Door County Cabin Weekend');
  const homeHash = await session.evaluate('location.hash');
  await clickText(session, 'Open event');
  await waitForText(session, 'Thread');
  const eventHash = await session.evaluate('location.hash');
  assert.notEqual(eventHash, homeHash, 'Opening an event did not create a navigable route.');
  record.screens.push(await auditLayout(session, 'owner Event detail', record.expectedCssWidth));
  await screenshot(session, `owner-event-${suffix}`);
  for (const text of ['Going', 'Maybe', "Can't go", 'Event reminder', 'Thread', 'Event gallery']) {
    assert.equal(await session.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`), true, `Owner event is missing ${text}.`);
  }
  assert.equal(await session.evaluate("Boolean(document.getElementById('event-message-input'))"), true, 'Comment composer is unreachable.');
  await clickText(session, 'Edit plan');
  await waitForText(session, 'Keep current plan');
  record.screens.push(await auditLayout(session, 'owner Edit plan', record.expectedCssWidth));
  await clickText(session, 'Keep current plan');
  await clickText(session, 'Add photo');
  await waitForText(session, 'Choose image file');
  await scrollTextIntoView(session, 'Choose image file');
  record.screens.push(await auditLayout(session, 'owner Photo form', record.expectedCssWidth));
  await clickText(session, 'Close photo form');

  await session.evaluate('history.back()');
  await waitUntil(session, `location.hash === ${JSON.stringify(homeHash)}`, 'Back did not restore Today.');
  await navigate(session, eventHash, 'Thread');
  await session.send('Page.reload', { ignoreCache: true });
  await waitForText(session, 'Thread');
  assert.equal(await session.evaluate('location.hash'), eventHash, 'Reload lost the exact event route.');
  record.navigation = { eventHash, homeHash, reloadHash: await session.evaluate('location.hash') };
}

async function memberEventMatrix(session, record) {
  await clickText(session, 'Calendar');
  await waitForText(session, 'Yellowstone Road Trip');
  await clickText(session, 'Open Yellowstone Road Trip');
  await waitForText(session, 'Thread');
  record.screens.push(await auditLayout(session, 'member own Event detail', record.expectedCssWidth));
  await clickText(session, 'Edit plan');
  await waitForText(session, 'Keep current plan');
  record.screens.push(await auditLayout(session, 'member own Edit plan', record.expectedCssWidth));
  await clickText(session, 'Keep current plan');
}

async function outsiderMatrix(session, record, suffix) {
  await waitForText(session, 'Join a family');
  record.screens.push(await auditLayout(session, 'outsider no-family', record.expectedCssWidth));
  assert.equal(await session.evaluate("Boolean(document.getElementById('family-invitation-code-input') && document.getElementById('export-passphrase'))"), true, 'Outsider onboarding/export is unreachable.');
  assert.equal(await session.evaluate("document.body.innerText.includes('Jones Family')"), false, 'Outsider can see the family.');
  await screenshot(session, `outsider-${suffix}`);
  await navigate(session, '#/event/00000000-0000-0000-0000-000000000001?from=home', 'Join a family');
  assert.equal(await session.evaluate("document.body.innerText.includes('Thread')"), false, 'Outsider direct route exposed event content.');
}

async function roleMatrix({ role, zoomPercent, physicalWidth, physicalHeight, expectedCssWidth, screenshotSuffix = `${zoomPercent}` }) {
  const profile = mkdtempSync(join(tmpdir(), `loopedin-real-zoom-${role}-${zoomPercent}-`));
  const defaultDir = join(profile, 'Default');
  mkdirSync(defaultDir, { recursive: true });
  const level = zoomPercent === 200 ? zoom200 : 0;
  writeFileSync(join(defaultDir, 'Preferences'), JSON.stringify({ partition: { default_zoom_level: { x: level } } }));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${physicalWidth},${physicalHeight}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let session;
  const record = { role, zoomPercent, expectedCssWidth, screens: [], console: [], failedRequests: [], httpErrors: [] };
  try {
    const port = await waitForDebugPort(profile);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    session = new CdpSession(target.webSocketDebuggerUrl);
    await session.open();
    session.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error' || event.type === 'warning') record.console.push({ type: event.type, values: event.args.map((arg) => arg.value ?? arg.description) });
    });
    session.on('Runtime.exceptionThrown', (event) => record.console.push({ type: 'exception', value: event.exceptionDetails.exception?.description ?? event.exceptionDetails.text }));
    session.on('Network.loadingFailed', (event) => {
      if (!event.canceled) record.failedRequests.push({ error: event.errorText, requestId: event.requestId });
    });
    session.on('Network.responseReceived', (event) => {
      if (event.response.status >= 400) record.httpErrors.push({ status: event.response.status, url: event.response.url });
    });
    await Promise.all([session.send('Page.enable'), session.send('Runtime.enable'), session.send('Network.enable')]);
    record.browser = await session.send('Browser.getVersion');
    await session.send('Page.navigate', { url: baseUrl.href });
    await waitForText(session, 'Welcome back');
    const zoom = await session.evaluate(`(() => ({
      cssZoom: getComputedStyle(document.documentElement).zoom || '1',
      dpr: devicePixelRatio,
      innerWidth,
      layoutWidth: document.documentElement.clientWidth,
      outerWidth,
      screenWidth: screen.width,
      viewportScale: visualViewport?.scale,
      viewportWidth: visualViewport?.width,
    }))()`);
    record.zoom = zoom;
    const expectedDpr = zoomPercent / 100;
    assert.ok(Math.abs(zoom.dpr - expectedDpr) < 0.01, `${role} ${zoomPercent}% DPR ${zoom.dpr} did not prove browser zoom.`);
    assert.ok(Math.abs(zoom.innerWidth - record.expectedCssWidth) <= 1 && Math.abs(zoom.viewportWidth - record.expectedCssWidth) <= 1, `${role} ${zoomPercent}% did not render the expected CSS viewport: ${JSON.stringify(zoom)}`);
    assert.equal(zoom.viewportScale, 1, `${role} ${zoomPercent}% used page/pinch scale instead of browser zoom.`);
    assert.ok(zoom.cssZoom === '1' || zoom.cssZoom === 'normal', `${role} ${zoomPercent}% used CSS zoom.`);

    if (role === 'signed-out') await signedOutMatrix(session, record, screenshotSuffix);
    if (role === 'owner') {
      await signIn(session, accounts.owner);
      await sharedMemberMatrix(session, role, record, screenshotSuffix);
      assert.equal(await session.evaluate("document.body.innerText.includes('Invite someone') && document.body.innerText.includes('Transfer ownership')"), true, 'Owner controls are missing.');
      await ownerEventMatrix(session, record, screenshotSuffix);
    }
    if (role === 'member') {
      await signIn(session, accounts.member);
      await sharedMemberMatrix(session, role, record, screenshotSuffix);
      assert.equal(await session.evaluate("document.body.innerText.includes('Leave family') && !document.body.innerText.includes('Invite someone')"), true, 'Member role controls are incorrect.');
      await memberEventMatrix(session, record);
    }
    if (role === 'outsider') {
      await signIn(session, accounts.outsider);
      await outsiderMatrix(session, record, screenshotSuffix);
    }

    const protectedHttpErrors = record.httpErrors.filter((item) => {
      const url = new URL(item.url);
      const inScope = url.origin === baseUrl.origin || url.origin === new URL(backendUrl).origin;
      return inScope && !(url.origin === baseUrl.origin && url.pathname === '/favicon.ico' && item.status === 404);
    });
    assert.deepEqual(protectedHttpErrors, [], `${role} ${zoomPercent}% had app/backend HTTP errors.`);
    assert.deepEqual(record.failedRequests, [], `${role} ${zoomPercent}% had failed network requests.`);
    assert.deepEqual(record.console, [], `${role} ${zoomPercent}% had console warnings/errors.`);
    return record;
  } finally {
    session?.socket.close();
    chrome.kill();
    await Promise.race([once(chrome, 'exit'), delay(2000)]);
    const resolvedProfile = resolve(profile);
    if (resolvedProfile.startsWith(resolve(tmpdir()))) {
      for (let attempt = 0; attempt < 10 && existsSync(resolvedProfile); attempt += 1) {
        try { rmSync(resolvedProfile, { recursive: true, force: true }); }
        catch (error) {
          if (error.code !== 'EBUSY' && error.code !== 'EPERM') throw error;
          await delay(200);
        }
      }
      assert.equal(existsSync(resolvedProfile), false, `Disposable Chrome profile remained locked: ${resolvedProfile}`);
    }
  }
}

async function desktopSecondary() {
  const record = await roleMatrix({ role: 'signed-out', zoomPercent: 200, physicalWidth: 2576, physicalHeight: 1800, expectedCssWidth: 1280, screenshotSuffix: 'desktop-200' });
  assert.ok(Math.abs(record.zoom.innerWidth - 1280) <= 1, `Desktop secondary width is ${record.zoom.innerWidth}px.`);
  return { ...record, role: 'desktop-signed-out' };
}

const evidence = { schemaVersion: 1, baseUrl: baseUrl.origin, marker, matrices: [], ownerWidthMatrices: [], zoomControls: [], desktop: null };
for (const zoomPercent of [100, 200]) {
  for (const role of ['signed-out', 'owner', 'member', 'outsider']) {
    evidence.matrices.push(await roleMatrix({
      role,
      zoomPercent,
      physicalWidth: zoomPercent === 100 ? 500 : 796,
      physicalHeight: 844 * (zoomPercent / 100),
      expectedCssWidth: zoomPercent === 100 ? 500 : 390,
    }));
  }
}
for (const width of [320, 430]) {
  evidence.ownerWidthMatrices.push(await roleMatrix({
    role: 'owner',
    zoomPercent: 200,
    physicalWidth: (width * 2) + 16,
    physicalHeight: 1688,
    expectedCssWidth: width,
    screenshotSuffix: `${width}-200`,
  }));
}
for (const width of [320, 390, 430]) {
  evidence.zoomControls.push(await roleMatrix({
    role: 'zoom-control',
    zoomPercent: 100,
    physicalWidth: (width * 2) + 16,
    physicalHeight: 1688,
    expectedCssWidth: width * 2,
  }));
}
evidence.desktop = await desktopSecondary();

for (const width of [320, 390, 430]) {
  const baseline = evidence.zoomControls.find((item) => item.expectedCssWidth === width * 2).zoom;
  const zoomed = width === 390
    ? evidence.matrices.find((item) => item.role === 'signed-out' && item.zoomPercent === 200).zoom
    : evidence.ownerWidthMatrices.find((item) => item.expectedCssWidth === width).zoom;
  assert.ok(Math.abs(zoomed.dpr / baseline.dpr - 2) < 0.01, `${width}px DPR did not double from 100% to 200%.`);
  assert.ok(Math.abs(zoomed.innerWidth / baseline.innerWidth - 0.5) < 0.01, `${width}px same physical window did not halve its CSS viewport at 200%.`);
}

writeFileSync(join(evidenceDir, 'result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`Real Chrome zoom passed: ${evidence.matrices.length} role/zoom matrices + owner 320/430 + three same-window controls + desktop 200%; DPR 1->2; CSS viewports 320/390/430px; screenshots/evidence=${evidenceDir}\n`);
