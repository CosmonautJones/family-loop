const fs = require('node:fs');
const path = require('node:path');

const expectedVersions = new Map([
  ['metro', '0.83.8'],
  ['metro-cache', '0.83.8'],
  ['metro-cache-key', '0.83.8'],
  ['metro-transform-worker', '0.83.8'],
]);

const legacyExports = {
  './src': './src/index.js',
  './src/*': './src/*.js',
  './src/*.js': './src/*.js',
};

const sourceShims = [
  {
    relativePath: 'metro/src/DeltaBundler/Serializers/sourceMapString.js',
    marker: 'exports.sourceMapStringNonBlocking = sourceMapStringNonBlocking;',
    shim: 'exports.default = sourceMapString;',
  },
  {
    relativePath: 'metro/src/ModuleGraph/worker/JsFileWrapping.js',
    marker: 'exports.wrapPolyfill = wrapPolyfill;',
    shim: 'exports.default = exports;',
  },
  {
    relativePath: 'metro-cache-key/src/index.js',
    marker: 'exports.getCacheKey = getCacheKey;',
    shim: 'exports.default = getCacheKey;',
  },
];

function occurrences(contents, needle) {
  return contents.split(needle).length - 1;
}

function patchMetroCompatibility(
  nodeModulesRoot = path.resolve(path.dirname(process.argv[1]), '..', 'node_modules'),
) {
  const writes = [];

  for (const [packageName, expectedVersion] of expectedVersions) {
    const packagePath = path.join(nodeModulesRoot, packageName, 'package.json');
    const installedPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (installedPackage.version !== expectedVersion) {
      throw new Error(
        `Expected ${packageName}@${expectedVersion}, found ${installedPackage.version ?? 'unknown'}.`,
      );
    }

    if (['metro', 'metro-cache', 'metro-transform-worker'].includes(packageName)) {
      const packageExports = installedPackage.exports;
      if (
        !packageExports ||
        packageExports['.'] !== './src/index.js' ||
        packageExports['./package.json'] !== './package.json' ||
        packageExports['./private/*'] !== './src/*.js'
      ) {
        throw new Error(`${packageName}@${expectedVersion} has an unexpected exports contract.`);
      }
      for (const [exportName, target] of Object.entries(legacyExports)) {
        if (packageExports[exportName] !== undefined && packageExports[exportName] !== target) {
          throw new Error(`${packageName}@${expectedVersion} has an unexpected ${exportName} export.`);
        }
        packageExports[exportName] = target;
      }
      writes.push([packagePath, `${JSON.stringify(installedPackage, null, 2)}\n`]);
    }
  }

  for (const { relativePath, marker, shim } of sourceShims) {
    const sourcePath = path.join(nodeModulesRoot, relativePath);
    const contents = fs.readFileSync(sourcePath, 'utf8');
    const shimCount = occurrences(contents, shim);
    if (shimCount > 1) {
      throw new Error(`${relativePath} contains the compatibility shim more than once.`);
    }
    if (shimCount === 1) {
      writes.push([sourcePath, contents]);
      continue;
    }
    if (occurrences(contents, marker) !== 1) {
      throw new Error(`${relativePath} does not contain the expected compatibility marker.`);
    }
    writes.push([sourcePath, contents.replace(marker, `${marker}\n${shim}`)]);
  }

  let changed = false;
  for (const [targetPath, contents] of writes) {
    if (fs.readFileSync(targetPath, 'utf8') !== contents) {
      fs.writeFileSync(targetPath, contents);
      changed = true;
    }
  }
  return { changed };
}

if (require.main === module) {
  const result = patchMetroCompatibility();
  console.log(`Metro 0.83.8 compatibility shim ${result.changed ? 'applied' : 'verified'}.`);
}

module.exports = { patchMetroCompatibility };
