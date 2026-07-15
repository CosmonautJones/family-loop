import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseRuntimeConfig, securityHeaders } from './web-release-policy.mjs';

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
  return parseRuntimeConfig(JSON.parse(readFileSync(runtimeConfigPath, 'utf8')));
}

function runtimeState() {
  try { return { config: validatedRuntimeConfig(), valid: true }; }
  catch { return { config: null, valid: false }; }
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
