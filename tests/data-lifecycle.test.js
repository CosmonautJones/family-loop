import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { buildLifecyclePlan } from '../scripts/data-lifecycle-plan.mjs';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const dataset = {
  profiles: [{ id: alice }, { id: bob }],
  memberships: [{ groupId: 'group-1', userId: alice }, { groupId: 'group-1', userId: bob }],
  groups: [{ id: 'group-1', createdBy: alice }],
  events: [{ id: 'event-1', groupId: 'group-1', createdBy: alice }],
  rsvps: [{ eventId: 'event-1', userId: alice }, { eventId: 'event-1', userId: bob }],
  messages: [{ id: 'message-a', authorId: alice }, { id: 'message-b', authorId: bob }],
  media: [{ id: 'media-a', uploadedBy: alice, storagePath: 'event-1/a.png', status: 'active' }],
  notifications: [{ id: 'notice-a', recipientId: alice }, { id: 'notice-b', recipientId: bob }],
  objects: [
    { id: 'object-a', bucketId: 'loopedin-event-media', name: 'event-1/a.png', ownerId: alice },
    { id: 'object-orphan', bucketId: 'loopedin-event-media', name: 'event-1/orphan.png', ownerId: bob },
  ],
};

test('lifecycle planner denies cross-user scope', () => {
  assert.throws(() => buildLifecyclePlan(dataset, { actorId: alice, subjectId: bob }), /Cross-user/);
});

test('lifecycle planner is deterministic, self-scoped, bounded, and never destructive', () => {
  const first = buildLifecyclePlan(dataset, { actorId: alice, subjectId: alice, maxActions: 3 });
  const second = buildLifecyclePlan(dataset, { actorId: alice, subjectId: alice, maxActions: 3 });
  assert.deepEqual(first, second);
  assert.equal(first.applyAllowed, false);
  assert.equal(first.deletionPlan.candidates.length, 3);
  assert.equal(first.deletionPlan.truncated, true);
  assert.equal(JSON.stringify(first.exportInventory).includes(bob), false);
  assert.deepEqual(first.exportInventory.messagesAuthored, ['message-a']);
  assert.deepEqual(first.exportInventory.notificationsReceived, ['notice-a']);
  assert.equal(first.mediaReconciliation.discrepancyCount, 1);
  assert.equal(first.mediaReconciliation.discrepancies[0].action, 'review-only');
});

test('lifecycle planner reports both row and object orphans without proposing deletion', () => {
  const plan = buildLifecyclePlan({
    ...dataset,
    media: [{ id: 'missing-object', uploadedBy: alice, storagePath: 'event-1/missing.png', status: 'pending' }],
  }, { actorId: alice, subjectId: alice });
  assert.deepEqual(plan.mediaReconciliation.discrepancies.map((item) => item.kind), [
    'row-without-object',
    'object-without-row',
    'object-without-row',
  ]);
  assert.ok(plan.mediaReconciliation.discrepancies.every((item) => item.excludedReason.includes('policy unavailable')));
});

test('local backup encryption authenticates round trips and rejects tampering', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'loopedin-backup-test-'));
  const input = join(directory, 'input.bin');
  const encrypted = join(directory, 'backup.flbackup');
  const output = join(directory, 'output.bin');
  const environment = { ...process.env, LOOPEDIN_BACKUP_PASSPHRASE: 'x'.repeat(32) };
  try {
    await writeFile(input, 'private family bytes that must not appear in ciphertext');
    const encrypt = spawnSync(process.execPath, ['scripts/local-backup-crypto.mjs', 'encrypt', input, encrypted], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    assert.equal(encrypt.status, 0, encrypt.stderr);
    const encryptedBytes = await readFile(encrypted);
    assert.equal(encryptedBytes.includes(Buffer.from('private family bytes')), false);

    const decrypt = spawnSync(process.execPath, ['scripts/local-backup-crypto.mjs', 'decrypt', encrypted, output], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    assert.equal(decrypt.status, 0, decrypt.stderr);
    assert.equal(await readFile(output, 'utf8'), 'private family bytes that must not appear in ciphertext');

    encryptedBytes[encryptedBytes.length - 1] ^= 1;
    await writeFile(encrypted, encryptedBytes);
    const tampered = spawnSync(process.execPath, ['scripts/local-backup-crypto.mjs', 'decrypt', encrypted, output], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    assert.notEqual(tampered.status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
