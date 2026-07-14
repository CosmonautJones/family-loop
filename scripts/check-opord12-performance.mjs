import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8092';
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'loopedin-opord12-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--disable-gpu',
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

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
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
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
}

async function waitForMain(session) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await session.evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[role=main], main'))")) return;
    await delay(50);
  }
  throw new Error('Application main landmark did not render.');
}

const observerSource = `(() => {
  window.__opord12 = { lcp: 0, cls: 0, longTasks: [] };
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    window.__opord12.lcp = entries.at(-1)?.startTime ?? window.__opord12.lcp;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__opord12.cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__opord12.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
  }).observe({ type: 'longtask', buffered: true });
})()`;

let session;
try {
  const port = await waitForDebugPort();
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Network.enable');
  const browser = await session.send('Browser.getVersion');
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: observerSource });
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: "sessionStorage.setItem('loopedin:local-actor:v1', 'person-you');" });
  await session.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await session.send('Page.navigate', { url: `${baseUrl}/#/home` });
  await waitForMain(session);
  await delay(3000);

  const runs = [];
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 500 * 1024 / 8,
    uploadThroughput: 500 * 1024 / 8,
    connectionType: 'cellular3g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (let run = 1; run <= 3; run += 1) {
    await session.send('Page.reload', { ignoreCache: false });
    await waitForMain(session);
    await delay(8000);
    const metrics = await session.evaluate(`(() => {
      const resources = performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize,
        decodedBodySize: entry.decodedBodySize,
        initiatorType: entry.initiatorType
      })).sort((a, b) => b.duration - a.duration).slice(0, 8);
      const backendRequests = performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('supabase.co') || name.includes('supabase.in') || name.includes('/rest/v1') || name.includes('/auth/v1') || name.includes('/storage/v1'));
      const tasks = window.__opord12.longTasks.toSorted((a, b) => b.duration - a.duration);
      return {
        run: ${run},
        lcpMs: Math.round(window.__opord12.lcp),
        longestTaskMs: Math.round(tasks[0]?.duration ?? 0),
        longTaskCount: tasks.length,
        cls: Number(window.__opord12.cls.toFixed(3)),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mainCount: document.querySelectorAll('[role=main], main').length,
        selectedTabs: document.querySelectorAll('[role=tab][aria-selected=true]').length,
        backendRequests,
        resources
      };
    })()`);
    runs.push(metrics);
  }

  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await session.send('Page.reload', { ignoreCache: false });
  await waitForMain(session);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await session.evaluate("[...document.querySelectorAll('[role=button], button')].some((element) => element.textContent?.trim() === 'Open event')")) break;
    await delay(10);
  }
  const route = await session.evaluate(`(async () => {
    const candidate = [...document.querySelectorAll('[role=button], button')].find((element) => element.textContent?.trim() === 'Open event');
    if (!candidate) return { error: 'Open event action not found.' };
    const previousHeading = document.querySelector('[role=main] [role=heading][aria-level="1"], main h1')?.textContent;
    const start = performance.now();
    candidate.click();
    while (performance.now() - start < 1000) {
      const heading = document.querySelector('[role=main] [role=heading][aria-level="1"], main h1');
      const actions = [...document.querySelectorAll('[role=main] [role=button], main button')].map((element) => element.textContent?.trim());
      if (location.hash.startsWith('#/event/') && heading?.textContent === previousHeading && actions.includes('Going') && actions.includes('Maybe')) {
        return {
          routeMs: Math.round(performance.now() - start),
          heading: heading.textContent,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth
        };
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    }
    return { error: 'Event route was not usable within one second.' };
  })()`);

  const evidence = { profile: { browser: browser.product, viewport: '390x844', network: '500 kbps / 400 ms RTT', cpu: '4x', cache: 'warm', dataMode: 'local' }, runs, route };
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  for (const run of runs) {
    if (run.lcpMs > 4000) throw new Error(`Run ${run.run} LCP exceeded 4000 ms.`);
    if (run.longestTaskMs > 200) throw new Error(`Run ${run.run} longest task exceeded 200 ms.`);
    if (run.clientWidth !== 390 || run.scrollWidth !== 390) throw new Error(`Run ${run.run} overflowed at 390px.`);
    if (run.backendRequests.length) throw new Error(`Run ${run.run} made a configured backend request.`);
  }
  if (route.error || route.routeMs > 1000 || route.clientWidth !== 390 || route.scrollWidth !== 390) {
    throw new Error(`Event route budget failed: ${JSON.stringify(route)}`);
  }
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
