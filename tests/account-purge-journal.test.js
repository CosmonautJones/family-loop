import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  appendPurgeJournalRecord,
  evaluateRestoreGate,
  normalizeJournalRecord,
  readPurgeJournal,
  recoverPurgeJournalHead,
} from '../scripts/account-purge-journal.mjs';

const operationId = '11111111-1111-4111-8111-111111111111';
const subjectId = '22222222-2222-4222-8222-222222222222';
const digest = 'a'.repeat(64);
const passphrase = 'local-only-journal-passphrase';

function record(phase, occurredAt, overrides = {}) {
  return {
    operationId,
    subjectId,
    planDigest: phase === 'leased' ? null : digest,
    phase,
    objectCount: 2,
    counts: { media: 1, memberships: 1 },
    occurredAt,
    retainUntil: new Date(Date.parse(occurredAt) + 32 * 86400000).toISOString(),
    failureCode: null,
    ...overrides,
  };
}

test('journal records are encrypted, authenticated, chained, and head-anchored', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loopedin-purge-journal-'));
  const journal = join(directory, 'journal.jsonl');
  try {
    await appendPurgeJournalRecord(journal, record('leased', '2026-07-16T20:00:00.000Z'), passphrase);
    await appendPurgeJournalRecord(journal, record('prepared', '2026-07-16T20:01:00.000Z'), passphrase);
    const raw = await readFile(journal, 'utf8');
    assert.equal(raw.includes(operationId), false);
    assert.equal(raw.includes(subjectId), false);
    assert.equal(raw.includes('prepared'), false);
    assert.deepEqual((await readPurgeJournal(journal, passphrase)).map((item) => item.phase), ['leased', 'prepared']);
    await assert.rejects(readPurgeJournal(journal, 'wrong-passphrase-value'), /authenticate|Unsupported state/i);

    const lines = raw.trim().split('\n');
    await writeFile(journal, `${lines[0]}\n`);
    await assert.rejects(readPurgeJournal(journal, passphrase), /head does not match/i);
    await assert.rejects(recoverPurgeJournalHead(journal, passphrase), /truncated journal/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('validated head recovery accepts only an authenticated appended tail', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loopedin-purge-journal-head-'));
  const journal = join(directory, 'journal.jsonl');
  try {
    await appendPurgeJournalRecord(journal, record('leased', '2026-07-16T20:00:00.000Z'), passphrase);
    const firstHead = await readFile(`${journal}.head`, 'utf8');
    await assert.rejects(recoverPurgeJournalHead(journal, passphrase), /not stale|strict extension/i);
    await rm(`${journal}.head`, { force: true });
    await assert.rejects(recoverPurgeJournalHead(journal, passphrase), /missing.*authenticated head|existing authenticated stale head/i);
    await assert.rejects(readFile(`${journal}.head`, 'utf8'), /ENOENT/);
    await writeFile(`${journal}.head`, firstHead);
    await appendPurgeJournalRecord(journal, record('prepared', '2026-07-16T20:01:00.000Z'), passphrase);
    await writeFile(`${journal}.head`, firstHead);
    await assert.rejects(readPurgeJournal(journal, passphrase), /head does not match/i);
    assert.deepEqual(await recoverPurgeJournalHead(journal, passphrase), { recordCount: 2, lastPhase: 'prepared' });
    assert.deepEqual((await readPurgeJournal(journal, passphrase)).map((item) => item.phase), ['leased', 'prepared']);

    const validHead = await readFile(`${journal}.head`, 'utf8');
    const lines = (await readFile(journal, 'utf8')).trim().split('\n');
    const damaged = JSON.parse(lines[1]);
    damaged.ciphertext = `${damaged.ciphertext.slice(0, -2)}AA`;
    await writeFile(journal, `${lines[0]}\n${JSON.stringify(damaged)}\n`);
    await assert.rejects(recoverPurgeJournalHead(journal, passphrase), /hash is invalid/i);
    assert.equal(await readFile(`${journal}.head`, 'utf8'), validHead, 'invalid tail must never replace or truncate the authenticated head');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('per-operation transitions are monotonic and failure annotations never advance state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loopedin-purge-journal-order-'));
  const journal = join(directory, 'journal.jsonl');
  try {
    await assert.rejects(
      appendPurgeJournalRecord(journal, record('relational_finalized', '2026-07-16T20:00:00.000Z'), passphrase),
      /out of order/,
    );
    await appendPurgeJournalRecord(journal, record('leased', '2026-07-16T20:00:00.000Z'), passphrase);
    await assert.rejects(
      appendPurgeJournalRecord(journal, record('auth_deleted', '2026-07-16T20:01:00.000Z'), passphrase),
      /out of order/,
    );
    await appendPurgeJournalRecord(journal, record('failed', '2026-07-16T20:02:00.000Z', { planDigest: null, failureCode: 'PREPARE_FAILED' }), passphrase);
    await appendPurgeJournalRecord(journal, record('prepared', '2026-07-16T20:03:00.000Z'), passphrase);
    await assert.rejects(
      appendPurgeJournalRecord(journal, record('completed', '2026-07-16T20:04:00.000Z'), passphrase),
      /out of order/,
    );
    await appendPurgeJournalRecord(journal, record('objects_deleted', '2026-07-16T20:05:00.000Z'), passphrase);
    await appendPurgeJournalRecord(journal, record('relational_finalized', '2026-07-16T20:06:00.000Z'), passphrase);
    await appendPurgeJournalRecord(journal, record('auth_deleted', '2026-07-16T20:07:00.000Z'), passphrase);
    await appendPurgeJournalRecord(journal, record('completed', '2026-07-16T20:08:00.000Z'), passphrase);
    await assert.rejects(
      appendPurgeJournalRecord(journal, record('failed', '2026-07-16T20:09:00.000Z', { failureCode: 'LATE_FAILURE' }), passphrase),
      /completed purge/,
    );
    assert.deepEqual((await readPurgeJournal(journal, passphrase)).map((item) => item.phase), [
      'leased', 'failed', 'prepared', 'objects_deleted', 'relational_finalized', 'auth_deleted', 'completed',
    ]);
    await appendPurgeJournalRecord(journal, record('restore_reconciled', '2026-07-16T20:10:00.000Z'), passphrase);
    assert.equal(evaluateRestoreGate(await readPurgeJournal(journal, passphrase), {
      snapshotAt: '2026-07-16T20:04:00.000Z',
    }).allowTraffic, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('journal rejects tampering, unsupported fields, plaintext failure detail, and short retention', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loopedin-purge-journal-tamper-'));
  const journal = join(directory, 'journal.jsonl');
  try {
    await appendPurgeJournalRecord(journal, record('leased', '2026-07-16T20:01:00.000Z'), passphrase);
    const raw = await readFile(journal, 'utf8');
    const envelope = JSON.parse(raw);
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;
    await writeFile(journal, `${JSON.stringify(envelope)}\n`);
    await assert.rejects(readPurgeJournal(journal, passphrase), /hash is invalid/i);

    assert.throws(() => normalizeJournalRecord({ ...record('prepared', '2026-07-16T20:01:00.000Z'), email: 'not-allowed' }), /unsupported field/);
    assert.throws(() => normalizeJournalRecord({ ...record('failed', '2026-07-16T20:01:00.000Z'), failureCode: 'private error detail' }), /failureCode/);
    assert.throws(() => normalizeJournalRecord({
      ...record('prepared', '2026-07-16T20:01:00.000Z'),
      retainUntil: '2026-08-15T20:01:00.000Z',
    }), /outlive/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('restore gate denies traffic until every post-snapshot destructive operation is reconciled', () => {
  const records = [
    normalizeJournalRecord(record('prepared', '2026-07-16T20:01:00.000Z')),
    normalizeJournalRecord(record('objects_deleted', '2026-07-16T20:02:00.000Z')),
    normalizeJournalRecord(record('completed', '2026-07-16T20:05:00.000Z')),
  ];
  const blocked = evaluateRestoreGate(records, { snapshotAt: '2026-07-16T20:00:00.000Z' });
  assert.equal(blocked.allowTraffic, false);
  assert.deepEqual(blocked.pendingOperationIds, [operationId]);
  const allowed = evaluateRestoreGate(records, {
    snapshotAt: '2026-07-16T20:00:00.000Z',
    reconciledOperationIds: [operationId],
  });
  assert.deepEqual(allowed, { allowTraffic: false, pendingCount: 1, pendingOperationIds: [operationId] });
  const reconciled = evaluateRestoreGate([
    ...records,
    normalizeJournalRecord(record('restore_reconciled', '2026-07-16T20:06:00.000Z')),
  ], { snapshotAt: '2026-07-16T20:00:00.000Z' });
  assert.deepEqual(reconciled, { allowTraffic: true, pendingCount: 0, pendingOperationIds: [] });
});
