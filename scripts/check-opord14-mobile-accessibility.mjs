import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8086';
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'loopedin-opord14-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--disable-gpu',
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForDebugPort() {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
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
    });
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async clickText(label) {
    const point = await this.evaluate(`(() => {
      const item = [...document.querySelectorAll('[role=button], button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)});
      if (!item) return null;
      item.scrollIntoView({ block: 'center' });
      const rect = item.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    if (!point) return false;
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    return true;
  }

  async pressKey(key) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await delay(100);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await this.evaluate("Boolean(document.querySelector('[role=main], main'))")) return;
      await delay(50);
    }
    const diagnostic = await this.evaluate("({ text: document.body.innerText, buttons: [...document.querySelectorAll('[role=button], button')].map((item) => item.textContent), root: document.querySelector('#root')?.innerHTML.slice(0, 500) })");
    throw new Error(`Application main landmark did not render at ${url}: ${JSON.stringify(diagnostic)}`);
  }
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

const evidence = { viewports: [], reducedMotion: {}, zoom: {}, keyboard: [], navigation: {}, form: {} };
let session;

try {
  const port = await waitForDebugPort();
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "sessionStorage.setItem('loopedin:local-actor:v1', 'person-you');",
  });

  for (const width of [320, 390, 430, 1280]) {
    await session.send('Emulation.setDeviceMetricsOverride', { width, height: width === 1280 ? 900 : 844, deviceScaleFactor: 1, mobile: width !== 1280 });
    await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await session.navigate(`${baseUrl}/#/home`);
    const metrics = await session.evaluate(`(() => ({
      width: ${width},
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      mainCount: document.querySelectorAll('[role=main], main').length,
      selectedTabs: document.querySelectorAll('[role=tab][aria-selected=true]').length,
      tabs: document.querySelectorAll('[role=tab]').length
    }))()`);
    evidence.viewports.push(metrics);
    assert(metrics.scrollWidth === metrics.clientWidth && metrics.bodyScrollWidth === metrics.clientWidth, `${width}px viewport has horizontal overflow.`);
    assert(metrics.mainCount === 1 && metrics.tabs === 5 && metrics.selectedTabs === 1, `${width}px landmark/navigation contract failed.`);
  }

  await session.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await session.navigate(`${baseUrl}/#/home`);
  evidence.reducedMotion = await session.evaluate(`(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    mainCount: document.querySelectorAll('[role=main], main').length
  }))()`);
  assert(evidence.reducedMotion.matches, 'Reduced-motion media emulation did not reach the page.');
  assert(evidence.reducedMotion.clientWidth === evidence.reducedMotion.scrollWidth, 'Reduced-motion render overflowed horizontally.');

  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  evidence.zoom = await session.evaluate(`(() => ({
    scale: visualViewport?.scale,
    viewportWidth: visualViewport?.width,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))()`);
  assert(evidence.zoom.scale === 2, 'Chrome did not apply the 200% page-scale proxy.');
  assert(evidence.zoom.clientWidth === evidence.zoom.scrollWidth, 'The 200% page-scale proxy introduced document overflow.');
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });

  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await session.navigate(`${baseUrl}/#/home`);
  await session.evaluate('document.activeElement?.blur()');
  for (let index = 0; index < 6; index += 1) {
    await session.pressKey('Tab');
    evidence.keyboard.push(await session.evaluate(`(() => ({
      role: document.activeElement?.getAttribute('role'),
      label: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim()
    }))()`));
  }
  assert(evidence.keyboard.slice(1).every((item) => item.role === 'tab'), `The five navigation tabs are not sequential after the account action: ${JSON.stringify(evidence.keyboard)}`);
  const originalHash = await session.evaluate('location.hash');
  await session.evaluate("location.hash = '#/event/event-door-county?from=home'");
  await delay(150);
  const eventHash = await session.evaluate('location.hash');
  assert(eventHash.startsWith('#/event/'), 'Deep link did not route to an exact event.');
  await session.evaluate('history.back()');
  await delay(150);
  const backHash = await session.evaluate('location.hash');
  assert(backHash === originalHash, 'Browser Back did not restore Home.');
  await session.send('Page.reload', { ignoreCache: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await session.evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[role=main], main'))")) break;
    await delay(50);
  }
  evidence.navigation = { originalHash, eventHash, backHash, reloadHash: await session.evaluate('location.hash') };
  assert(evidence.navigation.reloadHash === originalHash, 'Hard reload did not retain the route.');

  await session.evaluate("location.hash = '#/create'");
  await delay(150);
  await session.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 500, deviceScaleFactor: 1, mobile: true });
  const submitFound = await session.clickText('Create family plan');
  await delay(50);
  evidence.form = await session.evaluate(`(async () => {
    const active = document.activeElement;
    active?.scrollIntoView({ block: 'center' });
    const rect = active?.getBoundingClientRect();
    return {
      submitFound: ${submitFound},
      activeTag: active?.tagName ?? '',
      activeInvalid: active?.getAttribute('aria-invalid'),
      activeDescribedBy: active?.getAttribute('aria-describedby'),
      activeWithinViewport: Boolean(rect && rect.top >= 0 && rect.bottom <= innerHeight),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  })()`);
  assert(evidence.form.submitFound && evidence.form.activeTag === 'INPUT', `Invalid create submission did not focus an input: ${JSON.stringify(evidence.form)}`);
  assert(evidence.form.activeInvalid === 'true' && evidence.form.activeDescribedBy, 'Focused invalid input lacks its error relationship.');
  assert(evidence.form.activeWithinViewport, 'Focused field is not visible in the reduced-height virtual-keyboard proxy.');
  assert(evidence.form.clientWidth === evidence.form.scrollWidth, 'Focused form overflowed horizontally.');

  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  session?.socket.close();
  chrome.kill();
  await Promise.race([once(chrome, 'exit'), delay(2000)]);
  const resolvedProfile = resolve(profile);
  if (resolvedProfile.startsWith(resolve(tmpdir()))) {
    try {
      rmSync(resolvedProfile, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
    }
  }
}
