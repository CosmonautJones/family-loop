import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const checksumPath = path.join(migrationsDir, 'checksums.sha256');
const sqlName = /^(\d{14})_[a-z0-9_]+\.sql$/;

const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
const failures = [];
if (migrations.length === 0) failures.push('no SQL migrations found');

let priorTimestamp = '';
for (const name of migrations) {
  const match = name.match(sqlName);
  if (!match) {
    failures.push(`${name}: expected YYYYMMDDHHMMSS_snake_case.sql`);
    continue;
  }
  if (match[1] <= priorTimestamp) failures.push(`${name}: timestamp is not strictly increasing`);
  priorTimestamp = match[1];
  if (readFileSync(path.join(migrationsDir, name), 'utf8').trim().length === 0) {
    failures.push(`${name}: migration is empty`);
  }
}

if (!existsSync(checksumPath)) {
  failures.push('checksums.sha256 is missing');
} else {
  const lines = readFileSync(checksumPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const expected = new Map();
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  (\S+)$/);
    if (!match) {
      failures.push(`checksums.sha256: invalid line: ${line}`);
      continue;
    }
    if (expected.has(match[2])) failures.push(`checksums.sha256: duplicate ${match[2]}`);
    expected.set(match[2], match[1]);
  }
  for (const name of migrations) {
    const actual = createHash('sha256').update(readFileSync(path.join(migrationsDir, name))).digest('hex');
    if (!expected.has(name)) failures.push(`${name}: missing checksum`);
    else if (expected.get(name) !== actual) failures.push(`${name}: checksum mismatch; historical migrations are immutable`);
  }
  for (const name of expected.keys()) {
    if (!migrations.includes(name)) failures.push(`${name}: checksum has no migration`);
  }
}

const baseIndex = process.argv.indexOf('--base-ref');
if (baseIndex !== -1) {
  const baseRef = process.argv[baseIndex + 1];
  if (!baseRef) failures.push('--base-ref requires a Git revision');
  else if (!/^0+$/.test(baseRef)) {
    try {
      const baseFiles = execFileSync(
        'git',
        ['ls-tree', '-r', '--name-only', baseRef, '--', 'supabase/migrations'],
        { cwd: repoRoot, encoding: 'utf8' },
      ).trim().split(/\r?\n/).filter((name) => name.endsWith('.sql'));
      const baseNames = baseFiles.map((name) => path.basename(name)).sort();
      for (const name of baseNames) {
        const status = execFileSync(
          'git',
          ['diff', '--name-status', '--no-renames', baseRef, '--', `supabase/migrations/${name}`],
          { cwd: repoRoot, encoding: 'utf8' },
        ).trim();
        if (status) failures.push(`${name}: differs from ${baseRef}; create a new forward migration instead`);
      }
      const latestBase = baseNames.at(-1)?.match(sqlName)?.[1] ?? '';
      for (const name of migrations.filter((name) => !baseNames.includes(name))) {
        const timestamp = name.match(sqlName)?.[1] ?? '';
        if (timestamp <= latestBase) failures.push(`${name}: new migration does not follow ${baseNames.at(-1)}`);
      }
    } catch (error) {
      failures.push(`cannot compare migration base ${baseRef}: ${error.message.split(/\r?\n/)[0]}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Migration validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Migration validation passed (${migrations.length} ordered, checksummed migrations).`);
}
