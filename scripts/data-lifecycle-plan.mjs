import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function compareId(left, right) {
  return String(left.id ?? left.storagePath ?? left.name).localeCompare(String(right.id ?? right.storagePath ?? right.name));
}

function owned(records, key, subjectId) {
  return records.filter((record) => record[key] === subjectId).sort(compareId).map((record) => record.id);
}

export function buildLifecyclePlan(dataset, { actorId, subjectId, maxActions = 100 } = {}) {
  if (!actorId || actorId !== subjectId) {
    throw new Error('Cross-user lifecycle planning is denied; actorId must equal subjectId.');
  }
  if (!Number.isInteger(maxActions) || maxActions < 1 || maxActions > 500) {
    throw new Error('maxActions must be an integer from 1 through 500.');
  }

  const records = {
    profiles: dataset.profiles ?? [],
    memberships: dataset.memberships ?? [],
    groups: dataset.groups ?? [],
    events: dataset.events ?? [],
    rsvps: dataset.rsvps ?? [],
    messages: dataset.messages ?? [],
    media: dataset.media ?? [],
    notifications: dataset.notifications ?? [],
    objects: dataset.objects ?? [],
  };
  const subjectProfiles = records.profiles.filter((record) => record.id === subjectId).sort(compareId).map((record) => record.id);
  const subjectMemberships = records.memberships.filter((record) => record.userId === subjectId).sort(compareId).map((record) => `${record.groupId}:${record.userId}`);
  const subjectRsvps = records.rsvps.filter((record) => record.userId === subjectId).sort(compareId).map((record) => `${record.eventId}:${record.userId}`);

  const exportInventory = {
    profiles: subjectProfiles,
    memberships: subjectMemberships,
    groupsCreated: owned(records.groups, 'createdBy', subjectId),
    eventsCreated: owned(records.events, 'createdBy', subjectId),
    rsvps: subjectRsvps,
    messagesAuthored: owned(records.messages, 'authorId', subjectId),
    mediaUploaded: owned(records.media, 'uploadedBy', subjectId),
    notificationsReceived: owned(records.notifications, 'recipientId', subjectId),
    objectsOwned: records.objects.filter((record) => record.ownerId === subjectId).sort(compareId).map((record) => `${record.bucketId}/${record.name}`),
  };
  const foreignUserIds = new Set([
    ...records.profiles.map((record) => record.id),
    ...records.memberships.map((record) => record.userId),
  ].filter((id) => id && id !== subjectId));
  const serializedExport = JSON.stringify(exportInventory);
  for (const foreignId of foreignUserIds) {
    if (serializedExport.includes(foreignId)) throw new Error('Scoped export inventory included another user identifier.');
  }

  const deletionCandidates = [
    ...subjectProfiles.map((id) => ({ kind: 'profile', id, disposition: 'blocked-policy' })),
    ...subjectMemberships.map((id) => ({ kind: 'membership', id, disposition: 'blocked-policy' })),
    ...exportInventory.groupsCreated.map((id) => ({ kind: 'created-group', id, disposition: 'protected-shared' })),
    ...exportInventory.eventsCreated.map((id) => ({ kind: 'created-event', id, disposition: 'protected-shared' })),
    ...subjectRsvps.map((id) => ({ kind: 'rsvp', id, disposition: 'blocked-policy' })),
    ...exportInventory.messagesAuthored.map((id) => ({ kind: 'message', id, disposition: 'blocked-policy' })),
    ...exportInventory.mediaUploaded.map((id) => ({ kind: 'media', id, disposition: 'protected-or-grace-unknown' })),
    ...exportInventory.notificationsReceived.map((id) => ({ kind: 'notification', id, disposition: 'blocked-policy' })),
  ].sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`));

  const mediaByPath = new Map(records.media.filter((record) => record.storagePath).map((record) => [record.storagePath, record]));
  const objectByPath = new Map(records.objects.map((record) => [record.name, record]));
  const discrepancies = [];
  for (const media of [...records.media].sort(compareId)) {
    if (!objectByPath.has(media.storagePath)) {
      discrepancies.push({ kind: 'row-without-object', id: media.id, path: media.storagePath, action: 'review-only', excludedReason: 'retention/grace/legal-hold policy unavailable' });
    }
  }
  for (const object of [...records.objects].sort(compareId)) {
    if (!mediaByPath.has(object.name)) {
      discrepancies.push({ kind: 'object-without-row', id: object.id, path: object.name, action: 'review-only', excludedReason: 'retention/grace/legal-hold policy unavailable' });
    }
  }

  const boundedDeletionCandidates = deletionCandidates.slice(0, maxActions);
  const boundedDiscrepancies = discrepancies.slice(0, maxActions);
  return {
    format: 1,
    mode: 'dry-run',
    actorId,
    subjectId,
    authorization: 'self-scope assertion only; production authentication is not claimed',
    applyAllowed: false,
    exportInventory,
    deletionPlan: {
      totalCandidates: deletionCandidates.length,
      truncated: deletionCandidates.length > boundedDeletionCandidates.length,
      candidates: boundedDeletionCandidates,
      requiredApprovals: ['product export scope', 'retention periods', 'deletion grace', 'legal hold and backup-erasure policy', 'destructive run authorization'],
    },
    mediaReconciliation: {
      rowCount: records.media.length,
      objectCount: records.objects.length,
      discrepancyCount: discrepancies.length,
      truncated: discrepancies.length > boundedDiscrepancies.length,
      discrepancies: boundedDiscrepancies,
    },
  };
}

async function main() {
  const [inputPath, outputPath, actorId, subjectId, maxActionsValue] = process.argv.slice(2);
  if (!inputPath || !outputPath || !actorId || !subjectId) {
    throw new Error('Usage: data-lifecycle-plan.mjs <input.json> <output.json> <actorId> <subjectId> [maxActions]');
  }
  const plan = buildLifecyclePlan(JSON.parse(await readFile(inputPath, 'utf8')), {
    actorId,
    subjectId,
    maxActions: maxActionsValue === undefined ? 100 : Number(maxActionsValue),
  });
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`);
  process.stdout.write(`Dry-run lifecycle plan written: ${plan.deletionPlan.totalCandidates} deletion candidates, ${plan.mediaReconciliation.discrepancyCount} media discrepancies.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
