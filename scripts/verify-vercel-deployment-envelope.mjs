import { resolve } from 'node:path';
import { verifyEnvelope } from './build-vercel-deployment-envelope.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);

try {
  if (!args.get('--envelope') || !args.get('--expected-artifact-sha256') || !args.get('--expected-source-commit') || args.size !== 3) {
    throw new Error('Usage: node scripts/verify-vercel-deployment-envelope.mjs --envelope <path> --expected-artifact-sha256 <sha256> --expected-source-commit <sha>');
  }
  const result = verifyEnvelope(resolve(args.get('--envelope')), args.get('--expected-artifact-sha256'), args.get('--expected-source-commit'));
  process.stdout.write(`Deployment envelope verified.\nArtifact SHA-256: ${result.artifactSha256}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Deployment envelope verification failed.'}\n`);
  process.exitCode = 1;
}
