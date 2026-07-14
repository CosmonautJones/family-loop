import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileOutput = execFileSync(
  'git',
  ['ls-files', '-co', '--exclude-standard', '-z'],
  { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);

const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['JWT', /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{20,}/],
  [
    'named secret assignment',
    /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|DATABASE_URL)\s*[:=]\s*["']?(?!\$\{|process\.env|secrets\.|env\(|<|your-|example|placeholder)([^\s"']{12,})/i,
  ],
];

const findings = [];
for (const relativePath of fileOutput.split('\0').filter(Boolean)) {
  const baseName = path.basename(relativePath).toLowerCase();
  if (/^\.env(?:\.|$)/.test(baseName) && !/\.(?:example|sample|template)$/.test(baseName)) {
    findings.push(`${relativePath}: environment file`);
    continue;
  }

  const contents = readFileSync(path.join(repoRoot, relativePath));
  if (contents.includes(0)) continue;
  const text = contents.toString('utf8');
  for (const [name, pattern] of rules) {
    if (pattern.test(text)) findings.push(`${relativePath}: ${name}`);
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed. Review these file/rule matches; values are intentionally omitted:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed (${fileOutput.split('\0').filter(Boolean).length} repository files).`);
}
