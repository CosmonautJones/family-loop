import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const storeArgument = args.get('--store');
const runtimeConfigPath = resolve(args.get('--runtime-config') ?? '');
const store = resolve(storeArgument ?? '');
const alias = args.get('--alias') ?? 'stable';
const port = Number(args.get('--port') ?? 8087);
if (!storeArgument || !args.get('--runtime-config') || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(alias) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Usage: node scripts/serve-web-release.mjs --store <path> --runtime-config <path> --alias <name> --port <port>');
}

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function currentRelease() {
  const pointer = JSON.parse(readFileSync(join(store, 'aliases', `${alias}.json`), 'utf8'));
  if (!/^[0-9a-f]{64}$/.test(pointer.artifactSha256)) throw new Error('Alias digest is invalid.');
  const root = resolve(store, 'releases', pointer.artifactSha256);
  const expectedPrefix = resolve(store, 'releases') + sep;
  if (!root.startsWith(expectedPrefix)) throw new Error('Alias escaped the release store.');
  return { pointer, root };
}

function validatedRuntimeConfig() {
  const value = JSON.parse(readFileSync(runtimeConfigPath, 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Runtime config is not an object.');
  const allowed = new Set(['schemaVersion', 'environmentId', 'dataMode', 'supabaseUrl', 'supabasePublishableKey']);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('Runtime config has an unsupported field.');
  if (value.schemaVersion !== 1 || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value.environmentId ?? '')) throw new Error('Runtime config identity is invalid.');
  if (value.dataMode === 'local') {
    if ('supabaseUrl' in value || 'supabasePublishableKey' in value) throw new Error('Local config contains backend fields.');
    return value;
  }
  if (value.dataMode !== 'supabase' || typeof value.supabaseUrl !== 'string' || typeof value.supabasePublishableKey !== 'string') {
    throw new Error('Runtime config mode is invalid.');
  }
  const url = new URL(value.supabaseUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Runtime config URL is invalid.');
  }
  const key = value.supabasePublishableKey;
  let publishable = key.startsWith('sb_publishable_') && key.length >= 24;
  if (!publishable && key.split('.').length === 3) {
    try { publishable = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; } catch { publishable = false; }
  }
  if (!publishable || key.startsWith('sb_secret_') || /service[_-]?role/i.test(key)) throw new Error('Runtime config key is invalid.');
  return value;
}

function runtimeState() {
  try { return { config: validatedRuntimeConfig(), valid: true }; }
  catch { return { config: null, valid: false }; }
}

function securityHeaders(releaseId, config) {
  const connectSources = ["'self'"];
  const imageSources = ["'self'", 'data:', 'blob:', 'https:'];
  if (config?.dataMode === 'supabase') {
    const backend = new URL(config.supabaseUrl);
    connectSources.push(backend.origin, `${backend.protocol === 'https:' ? 'wss:' : 'ws:'}//${backend.host}`);
    imageSources.push(backend.origin);
  }
  return {
    'Content-Security-Policy': `default-src 'self'; base-uri 'self'; connect-src ${connectSources.join(' ')}; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src ${imageSources.join(' ')}; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'`,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-LoopedIn-Release': releaseId,
    'X-LoopedIn-Environment': config?.environmentId ?? 'unavailable',
  };
}

const server = createServer((request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' }).end('Method not allowed');
      return;
    }
    const { pointer, root } = currentRelease();
    const runtime = runtimeState();
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/runtime-config.json') {
      const headers = { ...securityHeaders(pointer.releaseId, runtime.config), 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
      if (!runtime.valid) {
        response.writeHead(503, headers).end('{"error":"Runtime configuration unavailable"}\n');
        return;
      }
      response.writeHead(200, headers);
      if (request.method === 'HEAD') response.end();
      else response.end(`${JSON.stringify(runtime.config)}\n`);
      return;
    }
    const relative = normalize(pathname).replace(/^([/\\])+/, '');
    let filePath = resolve(root, relative || 'index.html');
    if (!filePath.startsWith(root + sep) && filePath !== root) {
      response.writeHead(400).end('Bad request');
      return;
    }
    try {
      if (!statSync(filePath).isFile()) throw new Error('Not a file');
    } catch {
      if (extname(relative)) {
        response.writeHead(404, securityHeaders(pointer.releaseId, runtime.config)).end('Not found');
        return;
      }
      filePath = join(root, 'index.html');
    }
    const extension = extname(filePath).toLowerCase();
    const immutable = /[/\\](?:_expo[/\\]static|assets)[/\\]/.test(filePath) && /[a-f0-9]{8,}/i.test(filePath);
    const headers = {
      ...securityHeaders(pointer.releaseId, runtime.config),
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Type': types.get(extension) ?? 'application/octet-stream',
    };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Release unavailable');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`LoopedIn release preview listening on http://127.0.0.1:${port}\n`);
});
