import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const origin=process.argv[2];
assert.match(origin,/^https:\/\/(?:[a-f0-9]+--)?loopedin-family\.netlify\.app$/);
const manifest=JSON.parse(fs.readFileSync('/tmp/loopedin-release-tools/artifact/release-manifest.json','utf8'));
const expectedConfig=JSON.parse(fs.readFileSync('/tmp/loopedin-release-tools/runtime-config.json','utf8'));
async function get(path){const r=await fetch(origin+'/'+path,{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r;}
const remote=await (await get('release-manifest.json')).json();assert.deepEqual(remote,manifest);
for(const file of manifest.files){const r=await get(file.path);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,file.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),file.sha256,file.path);if(file.path.startsWith('_expo/static/'))assert.match(r.headers.get('cache-control'),/immutable/);}
const runtime=await get('runtime-config.json');assert.match(runtime.headers.get('cache-control'),/no-store/);assert.deepEqual(await runtime.json(),expectedConfig);
const shell=await get('');assert.equal(shell.headers.get('x-loopedin-release'),manifest.releaseId);assert.equal(shell.headers.get('x-loopedin-environment'),'loopedin-staging');assert.equal(shell.headers.get('x-content-type-options'),'nosniff');assert.match(shell.headers.get('cache-control'),/no-cache|max-age=0/);assert.ok(shell.headers.get('strict-transport-security'));assert.ok(shell.headers.get('content-security-policy').includes(expectedConfig.supabaseUrl));
const missing=await fetch(origin+'/verified-release-missing.js',{signal:AbortSignal.timeout(30000)});assert.equal(missing.status,404);
console.log(JSON.stringify({outcome:'PASS',checkedAt:new Date().toISOString(),origin,sourceCommit:manifest.sourceCommit,release:manifest.releaseId,artifactSha256:manifest.artifactSha256,verifiedFiles:manifest.files.length,runtime:'loopedin-staging',missingAssetStatus:missing.status}));
