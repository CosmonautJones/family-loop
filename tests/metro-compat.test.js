import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { patchMetroCompatibility } = require('../app/scripts/ensure-metro-compat.cjs');

function writeFixture(root, versions = {}) {
  const nodeModulesRoot = path.join(root, 'node_modules');
  const packages = ['metro', 'metro-cache', 'metro-transform-worker', 'metro-cache-key'];
  for (const name of packages) {
    const packageRoot = path.join(nodeModulesRoot, name);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name,
        version: versions[name] ?? '0.83.8',
        exports: {
          '.': './src/index.js',
          './package.json': './package.json',
          './private/*': './src/*.js',
        },
      }),
    );
  }

  const sources = new Map([
    [
      'metro/src/DeltaBundler/Serializers/sourceMapString.js',
      'exports.sourceMapString = sourceMapString;\nexports.sourceMapStringNonBlocking = sourceMapStringNonBlocking;\n',
    ],
    [
      'metro/src/ModuleGraph/worker/JsFileWrapping.js',
      'exports.wrapModule = wrapModule;\nexports.wrapPolyfill = wrapPolyfill;\n',
    ],
    [
      'metro-cache-key/src/index.js',
      'exports.getCacheKey = getCacheKey;\nfunction getCacheKey(files) { return files.length; }\n',
    ],
  ]);
  for (const [relativePath, contents] of sources) {
    const target = path.join(nodeModulesRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return nodeModulesRoot;
}

test('audited Metro compatibility shim is exact, fail-closed, and idempotent', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app', 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.postinstall, 'node scripts/ensure-metro-compat.cjs');
  assert.deepEqual(
    {
      metro: manifest.overrides.metro,
      metroConfig: manifest.overrides['metro-config'],
      metroTransformWorker: manifest.overrides['metro-transform-worker'],
    },
    { metro: '0.83.8', metroConfig: '0.83.8', metroTransformWorker: '0.83.8' },
  );
  assert.equal(manifest.overrides['@expo/cli'], undefined);
  assert.equal(manifest.overrides['@expo/metro-config'], undefined);
  const releaseBuilder = fs
    .readFileSync(path.join(repoRoot, 'scripts', 'build-web-release.ps1'), 'utf8')
    .replace(/\r\n/g, '\n');
  assert.match(
    releaseBuilder,
    /npm ci --no-audit --no-fund[\s\S]*?node scripts[\\/]ensure-metro-compat\.cjs[\s\S]*?npx expo export/,
  );

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-metro-compat-'));
  const nodeModulesRoot = writeFixture(fixtureRoot);
  patchMetroCompatibility(nodeModulesRoot);
  const firstPass = new Map();

  for (const name of ['metro', 'metro-cache', 'metro-transform-worker']) {
    const packagePath = path.join(nodeModulesRoot, name, 'package.json');
    const installedPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    assert.equal(installedPackage.exports['./src'], './src/index.js');
    assert.equal(installedPackage.exports['./src/*'], './src/*.js');
    assert.equal(installedPackage.exports['./src/*.js'], './src/*.js');
    firstPass.set(packagePath, fs.readFileSync(packagePath, 'utf8'));
  }

  const sourceChecks = new Map([
    ['metro/src/DeltaBundler/Serializers/sourceMapString.js', 'exports.default = sourceMapString;'],
    ['metro/src/ModuleGraph/worker/JsFileWrapping.js', 'exports.default = exports;'],
    ['metro-cache-key/src/index.js', 'exports.default = getCacheKey;'],
  ]);
  for (const [relativePath, shim] of sourceChecks) {
    const sourcePath = path.join(nodeModulesRoot, relativePath);
    const contents = fs.readFileSync(sourcePath, 'utf8');
    assert.equal(contents.split(shim).length - 1, 1);
    firstPass.set(sourcePath, contents);
  }

  patchMetroCompatibility(nodeModulesRoot);
  for (const [targetPath, contents] of firstPass) {
    assert.equal(fs.readFileSync(targetPath, 'utf8'), contents, `${targetPath} changed on replay`);
  }

  const rejectedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-metro-reject-'));
  const rejectedNodeModules = writeFixture(rejectedRoot, { metro: '0.83.7' });
  assert.throws(
    () => patchMetroCompatibility(rejectedNodeModules),
    /Expected metro@0\.83\.8, found 0\.83\.7/,
  );
  const rejectedManifest = JSON.parse(
    fs.readFileSync(path.join(rejectedNodeModules, 'metro-cache', 'package.json'), 'utf8'),
  );
  assert.equal(rejectedManifest.exports['./src'], undefined, 'preflight failure mutated another package');
});
