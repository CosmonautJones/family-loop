import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuntimeConfig, securityHeaders } from './web-release-policy.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function artifactFiles(root, manifest, allowedExtraFiles = []) {
  const expected = new Set(['release-manifest.json', ...manifest.files.map((file) => file.path), ...allowedExtraFiles]);
  const actual = [];
  const visit = (directory) => {
    for (const entry of statDirectory(directory)) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) actual.push(relative(root, path).split(sep).join('/'));
      else throw new Error(`Artifact contains unsupported filesystem entry: ${relative(root, path).split(sep).join('/')}.`);
    }
  };
  visit(root);
  if (actual.some((path) => !expected.has(path)) || expected.size !== actual.length) throw new Error('Artifact contains unexpected or missing files.');
}

function statDirectory(path) {
  return readdirSync(path, { withFileTypes: true });
}

export function verifyArtifact(artifactPath, expectedArtifactSha256, expectedSourceCommit, allowedExtraFiles = []) {
  const root = resolve(artifactPath);
  const manifestPath = join(root, 'release-manifest.json');
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) throw new Error('Artifact is missing release-manifest.json.');
  const manifest = jsonFile(manifestPath);
  if (!/^[0-9a-f]{64}$/.test(expectedArtifactSha256 ?? '') || !/^[0-9a-f]{40}$/.test(expectedSourceCommit ?? '')) {
    throw new Error('Trusted CI artifact digest and source commit are required.');
  }
  if (manifest.schemaVersion !== 2 || manifest.dataMode !== 'runtime' || 'environmentId' in manifest ||
      typeof manifest.appVersion !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.appVersion) ||
      !Number.isSafeInteger(manifest.sourceDateEpoch) || manifest.sourceDateEpoch < 0 ||
      !/^[0-9a-f]{40}$/.test(manifest.sourceCommit ?? '') || !/^[0-9a-f]{64}$/.test(manifest.artifactSha256 ?? '') ||
      manifest.releaseId !== `${manifest.appVersion}-${manifest.sourceCommit?.slice(0, 12)}` || !Array.isArray(manifest.files)) {
    throw new Error('Artifact manifest is invalid or unsupported.');
  }
  if (manifest.artifactSha256 !== expectedArtifactSha256) throw new Error('Artifact does not match the trusted CI artifact digest.');
  if (manifest.sourceCommit !== expectedSourceCommit) throw new Error('Artifact does not match the trusted CI source commit.');
  const seenPaths = new Set();
  const files = manifest.files.map((file) => {
    if (!isRecord(file) || typeof file.path !== 'string' || !/^[0-9A-Za-z._/-]+$/.test(file.path) || file.path.startsWith('/') || file.path.includes('\\') ||
        file.path.split('/').includes('..') || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[0-9a-f]{64}$/.test(file.sha256 ?? '')) {
      throw new Error('Artifact manifest file entry is invalid.');
    }
    if (seenPaths.has(file.path)) throw new Error(`Duplicate artifact path: ${file.path}.`);
    seenPaths.add(file.path);
    const path = resolve(root, file.path);
    if (!path.startsWith(`${root}${sep}`) || !existsSync(path) || !statSync(path).isFile()) throw new Error(`Artifact verification failed for ${file.path}.`);
    const contents = readFileSync(path);
    if (contents.length !== file.bytes || sha256(contents) !== file.sha256) throw new Error(`Artifact verification failed for ${file.path}.`);
    return file;
  });
  const sorted = [...files].sort((left, right) => left.path.localeCompare(right.path));
  if (files.some((file, index) => file.path !== sorted[index].path)) throw new Error('Artifact manifest files are not sorted.');
  artifactFiles(root, manifest, allowedExtraFiles);
  const canonicalFiles = files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join('\n');
  const canonical = `schemaVersion=2\nappVersion=${manifest.appVersion}\ndataMode=runtime\nsourceCommit=${manifest.sourceCommit}\nsourceDateEpoch=${manifest.sourceDateEpoch}\n${canonicalFiles}\n`;
  if (sha256(canonical) !== manifest.artifactSha256) throw new Error('Artifact digest does not match its manifest.');
  return manifest;
}

export function buildVercelConfig(manifest, config) {
  const fallbackSource = '/:path((?!_expo/static/|assets/)(?!.*\\.[^/]+$).*)';
  const cacheHeaders = manifest.files.map((file) => {
    const immutable = (file.path.startsWith('_expo/static/') || file.path.startsWith('assets/')) && /(?:^|[-.])[0-9a-f]{8,}(?:[.-]|$)/.test(file.path.split('/').at(-1));
    return {
      source: `/${file.path}`,
      headers: [{ key: 'Cache-Control', value: immutable ? 'public, max-age=31536000, immutable' : 'no-cache' }],
    };
  });
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    headers: [
      { source: '/(.*)', headers: Object.entries(securityHeaders(manifest.releaseId, config)).map(([key, value]) => ({ key, value })) },
      { source: '/runtime-config.json', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/release-manifest.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/deployment-envelope.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: fallbackSource, headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      ...cacheHeaders,
    ],
    rewrites: [{ source: fallbackSource, destination: '/index.html' }],
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

export function verifyEnvelope(envelopePath, expectedArtifactSha256, expectedSourceCommit) {
  const root = resolve(envelopePath);
  const extras = ['runtime-config.json', 'vercel.json', 'deployment-envelope.json'];
  const manifest = verifyArtifact(root, expectedArtifactSha256, expectedSourceCommit, extras);
  const config = parseRuntimeConfig(jsonFile(join(root, 'runtime-config.json')));
  const vercelPath = join(root, 'vercel.json');
  const deploymentPath = join(root, 'deployment-envelope.json');
  const vercelBytes = readFileSync(vercelPath);
  const runtimeBytes = readFileSync(join(root, 'runtime-config.json'));
  const expectedVercel = buildVercelConfig(manifest, config);
  if (JSON.stringify(jsonFile(vercelPath)) !== JSON.stringify(expectedVercel)) throw new Error('Vercel configuration does not match the runtime config.');
  const deployment = jsonFile(deploymentPath);
  const expectedDeployment = {
    schemaVersion: 1,
    releaseId: manifest.releaseId,
    sourceCommit: manifest.sourceCommit,
    artifactSha256: manifest.artifactSha256,
    environmentId: config.environmentId,
    runtimeConfigSha256: sha256(runtimeBytes),
    vercelConfigSha256: sha256(vercelBytes),
  };
  if (JSON.stringify(deployment) !== JSON.stringify(expectedDeployment)) throw new Error('Deployment envelope manifest is invalid.');
  return expectedDeployment;
}

export function buildEnvelope(artifactPath, runtimeConfigPath, outputPath, expectedArtifactSha256, expectedSourceCommit) {
  const artifact = resolve(artifactPath);
  const output = resolve(outputPath);
  const runtimePath = resolve(runtimeConfigPath);
  if (!existsSync(artifact) || !statSync(artifact).isDirectory()) throw new Error('Artifact directory does not exist.');
  if (existsSync(output)) throw new Error('Deployment envelope output already exists.');
  if (output === artifact || output.startsWith(`${artifact}${sep}`) || artifact.startsWith(`${output}${sep}`)) throw new Error('Deployment envelope output path is unsafe.');
  const manifest = verifyArtifact(artifact, expectedArtifactSha256, expectedSourceCommit);
  const config = parseRuntimeConfig(jsonFile(runtimePath));
  const temporary = mkdtempSync(join(dirname(output), '.loopedin-vercel-envelope-'));
  try {
    cpSync(artifact, temporary, { recursive: true });
    writeJson(join(temporary, 'runtime-config.json'), config);
    const vercel = buildVercelConfig(manifest, config);
    writeJson(join(temporary, 'vercel.json'), vercel);
    writeJson(join(temporary, 'deployment-envelope.json'), {
      schemaVersion: 1,
      releaseId: manifest.releaseId,
      sourceCommit: manifest.sourceCommit,
      artifactSha256: manifest.artifactSha256,
      environmentId: config.environmentId,
      runtimeConfigSha256: sha256(readFileSync(join(temporary, 'runtime-config.json'))),
      vercelConfigSha256: sha256(readFileSync(join(temporary, 'vercel.json'))),
    });
    verifyEnvelope(temporary, expectedArtifactSha256, expectedSourceCommit);
    renameSync(temporary, output);
  } finally {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
  }
  return verifyEnvelope(output, expectedArtifactSha256, expectedSourceCommit);
}

function argumentsMap(values) {
  const result = new Map();
  for (let index = 0; index < values.length; index += 2) result.set(values[index], values[index + 1]);
  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const args = argumentsMap(process.argv.slice(2));
    if (!args.get('--artifact') || !args.get('--runtime-config') || !args.get('--output') || !args.get('--expected-artifact-sha256') || !args.get('--expected-source-commit') || args.size !== 5) {
      throw new Error('Usage: node scripts/build-vercel-deployment-envelope.mjs --artifact <path> --runtime-config <path> --output <path> --expected-artifact-sha256 <sha256> --expected-source-commit <sha>');
    }
    const result = buildEnvelope(args.get('--artifact'), args.get('--runtime-config'), args.get('--output'), args.get('--expected-artifact-sha256'), args.get('--expected-source-commit'));
    process.stdout.write(`Deployment envelope: ${resolve(args.get('--output'))}\nArtifact SHA-256: ${result.artifactSha256}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Deployment envelope failed.'}\n`);
    process.exitCode = 1;
  }
}
