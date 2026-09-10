import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { verifyArtifact } from './build-netlify-deployment-envelope.mjs';
import { parseRuntimeConfig } from './web-release-policy.mjs';

const ORIGIN = 'https://loopedin-family.netlify.app';
const ENVIRONMENT = 'loopedin-staging';
const BACKEND = 'https://vkogznsfthirhxkqysza.supabase.co';

export function loadInvitationCandidate({ artifactPath, sourceCommit, artifactSha256, approvalReference } = {}) {
  if (typeof artifactPath !== 'string' || !artifactPath || !/^[0-9a-f]{40}$/.test(sourceCommit ?? '') ||
      !/^[0-9a-f]{64}$/.test(artifactSha256 ?? '') || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,119}$/.test(approvalReference ?? '')) {
    throw new Error('An artifact path, full source commit, artifact digest, and non-sensitive approval reference are required.');
  }
  return { manifest: verifyArtifact(artifactPath, artifactSha256, sourceCommit), approvalReference };
}

async function readBounded(response, limit) {
  if (!response.ok) throw new Error('Hosted invitation preflight request failed.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Hosted invitation preflight response is empty.');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('Hosted invitation preflight response exceeds its byte limit.');
      chunks.push(value);
    }
    return Buffer.concat(chunks, length);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function verifyHostedInvitationCandidate(candidate, { fetchImpl = fetch, expectedPublishableKey } = {}) {
  const { manifest } = candidate;
  const request = (path) => fetchImpl(`${ORIGIN}${path}`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  const shell = await request('/');
  if (shell.status !== 200 || shell.headers.get('x-loopedin-release') !== manifest.releaseId || shell.headers.get('x-loopedin-environment') !== ENVIRONMENT) {
    await shell.body?.cancel();
    throw new Error('Hosted invitation release identity mismatch.');
  }
  const index = manifest.files.find((file) => file.path === 'index.html');
  const shellBytes = await readBounded(shell, index.bytes);
  if (shellBytes.length !== index.bytes || createHash('sha256').update(shellBytes).digest('hex') !== index.sha256) {
    throw new Error('Hosted invitation root payload mismatch.');
  }
  const remoteManifest = JSON.parse((await readBounded(await request('/release-manifest.json'), 1_048_576)).toString('utf8'));
  if (!isDeepStrictEqual(remoteManifest, manifest)) throw new Error('Hosted invitation manifest mismatch.');
  const runtimeResponse = await request('/runtime-config.json');
  if (!(runtimeResponse.headers.get('cache-control') ?? '').split(',').some((token) => token.trim().toLowerCase() === 'no-store')) {
    await runtimeResponse.body?.cancel();
    throw new Error('Hosted invitation runtime cache policy mismatch.');
  }
  const runtime = parseRuntimeConfig(JSON.parse((await readBounded(runtimeResponse, 16_384)).toString('utf8')));
  if (runtime.dataMode !== 'supabase' || runtime.environmentId !== ENVIRONMENT || runtime.supabaseUrl !== BACKEND ||
      (expectedPublishableKey !== undefined && runtime.supabasePublishableKey !== expectedPublishableKey)) {
    throw new Error('Hosted invitation runtime identity mismatch.');
  }
  for (const file of manifest.files) {
    const bytes = await readBounded(await request(`/${file.path}`), file.bytes);
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
      throw new Error('Hosted invitation payload mismatch.');
    }
  }
  return { sourceCommit: manifest.sourceCommit, artifactSha256: manifest.artifactSha256, releaseId: manifest.releaseId, verifiedFiles: manifest.files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [artifactPath, sourceCommit, artifactSha256, approvalReference, ...extra] = process.argv.slice(2);
    if (extra.length) throw new Error('Unexpected preflight arguments.');
    const candidate = loadInvitationCandidate({ artifactPath, sourceCommit, artifactSha256, approvalReference });
    console.log(JSON.stringify({ outcome: 'PASS', ...await verifyHostedInvitationCandidate(candidate) }));
  } catch {
    console.error('Hosted invitation release preflight failed. No credentials or test accounts were requested. Verify the trusted artifact and deployed candidate.');
    process.exitCode = 1;
  }
}
