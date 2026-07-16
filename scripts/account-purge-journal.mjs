import {
  appendFile,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FORMAT = 1;
const ITERATIONS = 310_000;
const ZERO_HASH = '0'.repeat(64);
const MINIMUM_RETENTION_MS = 31 * 24 * 60 * 60 * 1000;
const PHASES = new Set([
  'leased',
  'prepared',
  'objects_deleted',
  'relational_finalized',
  'auth_deleted',
  'completed',
  'failed',
  'restore_reconciled',
]);
const PROGRESS_PHASES = [
  'leased',
  'prepared',
  'objects_deleted',
  'relational_finalized',
  'auth_deleted',
  'completed',
  'restore_reconciled',
];

function key(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 16) {
    throw new Error('LOOPEDIN_PURGE_JOURNAL_PASSPHRASE must contain at least 16 characters.');
  }
  return pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function instant(value, name) {
  const timestamp = Date.parse(value);
  if (typeof value !== 'string' || !Number.isFinite(timestamp)) throw new Error(`${name} must be an ISO timestamp.`);
  return timestamp;
}

function normalizeCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('counts must be an object.');
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  for (const [name, count] of entries) {
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(name) || !Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
      throw new Error('counts must contain bounded identifier/integer pairs.');
    }
  }
  return Object.fromEntries(entries);
}

export function normalizeJournalRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('journal record must be an object.');
  const allowed = new Set(['operationId', 'subjectId', 'planDigest', 'phase', 'objectCount', 'counts', 'occurredAt', 'retainUntil', 'failureCode']);
  for (const name of Object.keys(value)) if (!allowed.has(name)) throw new Error(`journal record contains unsupported field ${name}.`);
  if (!isUuid(value.operationId)) throw new Error('operationId must be a UUID.');
  if (!isUuid(value.subjectId)) throw new Error('subjectId must remain a UUID through completion and reconciliation.');
  if (!PHASES.has(value.phase)) throw new Error('phase is not supported.');
  if (value.planDigest !== null && value.planDigest !== undefined && !/^[a-f0-9]{64}$/.test(value.planDigest)) {
    throw new Error('planDigest must be a lowercase SHA-256 digest or null.');
  }
  if (!Number.isSafeInteger(value.objectCount) || value.objectCount < 0 || value.objectCount > 10_000) {
    throw new Error('objectCount must be a bounded integer.');
  }
  const occurredAt = instant(value.occurredAt, 'occurredAt');
  const retainUntil = instant(value.retainUntil, 'retainUntil');
  if (retainUntil - occurredAt < MINIMUM_RETENTION_MS) {
    throw new Error('retainUntil must outlive the 30-day backup window by at least one day.');
  }
  const failureCode = value.failureCode ?? null;
  if (failureCode !== null && !/^[A-Z][A-Z0-9_]{2,31}$/.test(failureCode)) throw new Error('failureCode must be a bounded code or null.');
  if ((value.phase === 'failed') !== (failureCode !== null)) throw new Error('failureCode is required only for failed records.');
  if (!['leased', 'failed'].includes(value.phase) && !value.planDigest) throw new Error('a plan digest is required after leasing.');

  return {
    operationId: value.operationId.toLowerCase(),
    subjectId: value.subjectId.toLowerCase(),
    planDigest: value.planDigest ?? null,
    phase: value.phase,
    objectCount: value.objectCount,
    counts: normalizeCounts(value.counts ?? {}),
    occurredAt: new Date(occurredAt).toISOString(),
    retainUntil: new Date(retainUntil).toISOString(),
    failureCode,
  };
}

export function getOperationJournalState(records, operationId) {
  if (!isUuid(operationId)) throw new Error('operationId must be a UUID.');
  const related = records.filter((record) => record.operationId === operationId.toLowerCase());
  const progress = related.filter((record) => record.phase !== 'failed').at(-1) ?? null;
  return {
    phase: progress?.phase ?? null,
    subjectId: progress?.subjectId ?? related.at(-1)?.subjectId ?? null,
    planDigest: progress?.planDigest ?? null,
    objectCount: progress?.objectCount ?? 0,
    counts: progress?.counts ?? {},
    retainUntil: related.reduce((latest, record) => Date.parse(record.retainUntil) > Date.parse(latest) ? record.retainUntil : latest, related[0]?.retainUntil ?? new Date(0).toISOString()),
  };
}

function validateTransition(records, record) {
  const related = records.filter((item) => item.operationId === record.operationId);
  const state = getOperationJournalState(records, record.operationId);
  if (state.subjectId && state.subjectId !== record.subjectId) throw new Error('subjectId cannot change within a purge operation.');
  if (related.length && Date.parse(record.retainUntil) < Date.parse(state.retainUntil)) {
    throw new Error('retainUntil cannot move backward within a purge operation.');
  }
  if (state.planDigest && record.planDigest && state.planDigest !== record.planDigest) {
    throw new Error('planDigest cannot change after preparation.');
  }
  if (record.phase === 'failed') {
    if (state.phase === 'completed' || state.phase === 'restore_reconciled') throw new Error('a completed purge cannot receive a failure annotation.');
    return;
  }
  const nextIndex = PROGRESS_PHASES.indexOf(record.phase);
  const currentIndex = state.phase === null ? -1 : PROGRESS_PHASES.indexOf(state.phase);
  if (nextIndex < 0 || (currentIndex === -1 && nextIndex !== 0) || (currentIndex >= 0 && nextIndex !== currentIndex && nextIndex !== currentIndex + 1)) {
    throw new Error(`purge phase ${record.phase} is out of order after ${state.phase ?? 'no checkpoint'}.`);
  }
}

function envelopeHash(envelope) {
  return createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
}

function encryptRecord(record, passphrase, sequence, previousHash) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aad = Buffer.from(`${FORMAT}|${sequence}|${previousHash}`, 'utf8');
  const cipher = createCipheriv('aes-256-gcm', key(passphrase, salt), iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(record), 'utf8'), cipher.final()]);
  const withoutHash = {
    format: FORMAT,
    sequence,
    previousHash,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
  return { ...withoutHash, hash: envelopeHash(withoutHash) };
}

function decryptEnvelope(envelope, passphrase, expectedSequence, expectedPreviousHash) {
  if (envelope?.format !== FORMAT || envelope.sequence !== expectedSequence || envelope.previousHash !== expectedPreviousHash) {
    throw new Error('journal sequence or chain is invalid.');
  }
  const { hash, ...withoutHash } = envelope;
  if (!/^[a-f0-9]{64}$/.test(hash) || envelopeHash(withoutHash) !== hash) throw new Error('journal envelope hash is invalid.');
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(passphrase, salt), iv);
  decipher.setAAD(Buffer.from(`${FORMAT}|${expectedSequence}|${expectedPreviousHash}`, 'utf8'));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return { record: normalizeJournalRecord(JSON.parse(plaintext)), hash };
}

function createHead(sequence, hash, passphrase) {
  const salt = randomBytes(16);
  const message = `${FORMAT}|${sequence}|${hash}`;
  const mac = createHmac('sha256', key(passphrase, salt)).update(message).digest('hex');
  return { format: FORMAT, sequence, hash, salt: salt.toString('base64'), mac };
}

function verifyHead(head, sequence, hash, passphrase) {
  if (head?.format !== FORMAT || !Number.isSafeInteger(head.sequence) || head.sequence < 1
      || !/^[a-f0-9]{64}$/.test(head.hash) || head.sequence !== sequence || head.hash !== hash
      || !/^[a-f0-9]{64}$/.test(head.mac)) {
    throw new Error('journal head does not match the append-only chain.');
  }
  const expected = createHmac('sha256', key(passphrase, Buffer.from(head.salt, 'base64')))
    .update(`${FORMAT}|${sequence}|${hash}`)
    .digest();
  const actual = Buffer.from(head.mac, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('journal head authentication failed.');
}

async function readJournalChain(journalPath, passphrase) {
  let rawJournal;
  try {
    rawJournal = await readFile(journalPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return { records: [], sequence: 0, hash: ZERO_HASH, hashes: [] };
    throw error;
  }
  const lines = rawJournal.split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error('journal contains no authenticated records.');
  const records = [];
  const hashes = [];
  let previousHash = ZERO_HASH;
  for (let index = 0; index < lines.length; index += 1) {
    const decoded = decryptEnvelope(JSON.parse(lines[index]), passphrase, index + 1, previousHash);
    records.push(decoded.record);
    previousHash = decoded.hash;
    hashes.push(decoded.hash);
  }
  return { records, sequence: lines.length, hash: previousHash, hashes };
}

async function replaceHead(journalPath, sequence, hash, passphrase) {
  const head = createHead(sequence, hash, passphrase);
  const temporaryHead = `${journalPath}.head.${process.pid}.${randomBytes(4).toString('hex')}`;
  await writeFile(temporaryHead, `${JSON.stringify(head)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryHead, `${journalPath}.head`);
}

export async function readPurgeJournal(journalPath, passphrase) {
  const chain = await readJournalChain(journalPath, passphrase);
  if (chain.sequence === 0) {
    try {
      await readFile(`${journalPath}.head`, 'utf8');
      throw new Error('journal head exists without a journal.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return [];
  }
  let rawHead;
  try {
    rawHead = await readFile(`${journalPath}.head`, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('journal is missing its authenticated head; run recover-head after validating custody.');
    throw error;
  }
  verifyHead(JSON.parse(rawHead), chain.sequence, chain.hash, passphrase);
  return chain.records;
}

export async function recoverPurgeJournalHead(journalPath, passphrase) {
  const lockPath = `${journalPath}.lock`;
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('purge journal is locked by another operator.');
    throw error;
  }
  try {
    const chain = await readJournalChain(journalPath, passphrase);
    if (chain.sequence === 0) throw new Error('cannot recover a head without a journal chain.');
    let existingHead;
    try {
      existingHead = JSON.parse(await readFile(`${journalPath}.head`, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') throw new Error('head recovery requires an existing authenticated stale head.');
      throw error;
    }
    verifyHead(existingHead, existingHead.sequence, existingHead.hash, passphrase);
    if (existingHead.sequence > chain.sequence) throw new Error('head recovery would accept a truncated journal; restore the missing tail instead.');
    if (existingHead.sequence === chain.sequence) throw new Error('authenticated journal head is not stale; recovery requires a strict extension.');
    if (chain.hashes[existingHead.sequence - 1] !== existingHead.hash) {
      throw new Error('the appended tail does not extend the authenticated head.');
    }
    await replaceHead(journalPath, chain.sequence, chain.hash, passphrase);
    return { recordCount: chain.sequence, lastPhase: chain.records.at(-1).phase };
  } finally {
    await lock?.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

export async function appendPurgeJournalRecord(journalPath, value, passphrase) {
  const lockPath = `${journalPath}.lock`;
  await mkdir(dirname(journalPath), { recursive: true });
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('purge journal is locked by another operator.');
    throw error;
  }
  try {
    const records = await readPurgeJournal(journalPath, passphrase);
    const record = normalizeJournalRecord(value);
    validateTransition(records, record);
    const raw = records.length ? await readFile(journalPath, 'utf8') : '';
    const priorLine = raw.split(/\r?\n/).filter(Boolean).at(-1);
    const previousHash = priorLine ? JSON.parse(priorLine).hash : ZERO_HASH;
    const envelope = encryptRecord(record, passphrase, records.length + 1, previousHash);
    await appendFile(journalPath, `${JSON.stringify(envelope)}\n`, { encoding: 'utf8', mode: 0o600 });
    await replaceHead(journalPath, envelope.sequence, envelope.hash, passphrase);
    return { sequence: envelope.sequence, phase: record.phase };
  } finally {
    await lock?.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

export function evaluateRestoreGate(records, { snapshotAt } = {}) {
  const snapshotTime = instant(snapshotAt, 'snapshotAt');
  const latest = new Map();
  for (const record of records) {
    if (record.phase !== 'failed' && Date.parse(record.occurredAt) > snapshotTime) latest.set(record.operationId, record);
  }
  const pending = [...latest.values()].filter((record) =>
    ['objects_deleted', 'relational_finalized', 'auth_deleted', 'completed'].includes(record.phase));
  return {
    allowTraffic: pending.length === 0,
    pendingCount: pending.length,
    pendingOperationIds: pending.map((record) => record.operationId).sort(),
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const [command, journalPath, inputPath] = process.argv.slice(2);
  const passphrase = process.env.LOOPEDIN_PURGE_JOURNAL_PASSPHRASE;
  if (!command || !journalPath) throw new Error('Usage: account-purge-journal.mjs <append|verify|recover-head|state|restore-gate> <journal> [input|-]');
  if (command === 'append') {
    const raw = inputPath && inputPath !== '-' ? await readFile(inputPath, 'utf8') : await readStdin();
    const result = await appendPurgeJournalRecord(journalPath, JSON.parse(raw), passphrase);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === 'recover-head') {
    const result = await recoverPurgeJournalHead(journalPath, passphrase);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const records = await readPurgeJournal(journalPath, passphrase);
  if (command === 'verify') {
    process.stdout.write(`${JSON.stringify({ recordCount: records.length, lastPhase: records.at(-1)?.phase ?? null })}\n`);
    return;
  }
  if (command === 'state') {
    const state = getOperationJournalState(records, inputPath);
    process.stdout.write(`${JSON.stringify({ phase: state.phase, planDigest: state.planDigest, objectCount: state.objectCount, counts: state.counts, retainUntil: state.retainUntil })}\n`);
    return;
  }
  if (command === 'restore-gate') {
    const raw = inputPath && inputPath !== '-' ? await readFile(inputPath, 'utf8') : await readStdin();
    const result = evaluateRestoreGate(records, JSON.parse(raw));
    process.stdout.write(`${JSON.stringify({ allowTraffic: result.allowTraffic, pendingCount: result.pendingCount })}\n`);
    if (!result.allowTraffic) process.exitCode = 2;
    return;
  }
  throw new Error('Unsupported purge journal command.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
