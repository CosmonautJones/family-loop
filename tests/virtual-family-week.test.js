import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Exercise the actual durable adapter and selectors, using disposable storage.
// These are local simulations, not Supabase/RLS or email-delivery evidence.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-family-week-'));
after(() => fs.rmSync(output, { recursive: true, force: true }));
execFileSync(process.execPath, [path.join(root, 'app/node_modules/typescript/bin/tsc'),
  path.join(root, 'app/src/services/durableLocalAdapter.ts'),
  path.join(root, 'app/src/features/memories/derivedHistory.ts'),
  path.join(root, 'app/src/app/selectors.ts'),
  '--outDir', output, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck',
]);
const require = createRequire(path.join(output, 'simulation.cjs'));
const { createDurableLocalLoopedInService, durableDatabaseKey } = require(path.join(output, 'services/durableLocalAdapter.js'));
const { createMockDatabase } = require(path.join(output, 'services/mockData.js'));
const { createMemoryActorSessionStore } = require(path.join(output, 'services/localActorSession.js'));
const { selectCompletedEvents, deriveEventHistory } = require(path.join(output, 'features/memories/derivedHistory.js'));
const { selectHomeViewModel, selectCalendarViewModel } = require(path.join(output, 'app/selectors.js'));

function household() {
  const seed = createMockDatabase();
  const family = seed.groups[0];
  family.name = 'Simulation Family';
  family.members = family.members.slice(0, 3);
  family.memberCount = 3;
  family.members.forEach((member, i) => { member.name = ['Sam Organizer', 'Jamie Partner', 'Casey Relative'][i]; });
  const outsiderId = 'person-simulation-outsider';
  seed.groups.push({ ...family, id: 'group-simulation-outsider', name: 'Other Family', memberCount: 1,
    members: [{ id: outsiderId, name: 'Taylor Outsider', initials: 'TO', avatarUri: '', role: 'owner' }] });
  for (const key of Object.keys(seed)) if (key !== 'groups') seed[key] = [];
  const records = new Map();
  let failBefore = false;
  let loseResponse = false;
  const storage = {
    async getItem(key) { return records.get(key) ?? null; },
    async setItem(key, value) {
      if (failBefore) { failBefore = false; throw new Error('Simulated storage unavailable'); }
      records.set(key, value);
      if (loseResponse) { loseResponse = false; throw new Error('Simulated lost acknowledgement'); }
    },
    async removeItem(key) { records.delete(key); },
  };
  const as = (id) => createDurableLocalLoopedInService(storage, () => seed, createMemoryActorSessionStore(id));
  const ids = family.members.map((member) => member.id);
  return { as, ids, groupId: family.id, owner: as(ids[0]), partner: as(ids[1]), relative: as(ids[2]),
    outsider: as(outsiderId), snapshot: () => JSON.parse(records.get(durableDatabaseKey)),
    failNextWrite: () => { failBefore = true; }, loseNextAcknowledgement: () => { loseResponse = true; } };
}

function plan(groupId, day = 14, key = `plan-${day}`) {
  return { groupId, operationKey: key, title: `Family plan ${day}`, location: 'Simulation community park',
    description: 'Bring snacks and meet by the entrance.',
    startsAt: `2026-09-${day}T17:00:00-04:00`, endsAt: `2026-09-${day}T19:00:00-04:00` };
}
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=';

test('virtual week: three relatives coordinate seven plans and reconstruct the same history', async () => {
  const h = household();
  const titles = ['School pickup', 'Family dinner', 'Library visit', 'Birthday planning', 'Movie night', 'Park picnic', 'Sunday lunch'];
  const events = [];
  for (let day = 0; day < 7; day++) {
    const event = await h.owner.events.createEvent({ ...plan(h.groupId, 14 + day), title: titles[day] });
    events.push(event);
    await Promise.all([h.partner.rsvps.upsertRsvp({ eventId: event.id, status: 'going' }),
      h.relative.rsvps.upsertRsvp({ eventId: event.id, status: 'maybe' }),
      h.partner.thread.sendMessage(event.id, `I can help with ${titles[day]}.`, `message-${day}`)]);
  }
  await h.owner.events.updateEvent(events[5].id, { location: 'Simulation indoor playroom' });
  await h.relative.rsvps.upsertRsvp({ eventId: events[5].id, status: 'going' });
  const photo = await h.partner.media.uploadMedia({ eventId: events[5].id, fileUri: tinyPng, altText: 'Synthetic picnic test image' });
  const reloaded = h.as(h.ids[1]);
  const persisted = await reloaded.events.listEvents(h.groupId);
  assert.equal(persisted.length, 7);
  assert.deepEqual(persisted.map((event) => event.title), titles);
  assert.equal((await reloaded.events.getEvent(events[5].id)).location, 'Simulation indoor playroom');
  assert.equal((await reloaded.rsvps.listRsvps(events[5].id)).filter((rsvp) => rsvp.status === 'going').length, 2);
  const completed = selectCompletedEvents(persisted, new Date('2026-09-21T12:00:00Z'));
  assert.equal(completed.length, 7);
  const history = deriveEventHistory(events[5], h.snapshot().database.messages, h.snapshot().database.media);
  assert.equal(history.messages.length, 1);
  assert.deepEqual(history.media.map((item) => item.id), [photo.id]);
});

test('virtual week: double submits and lost acknowledgements produce one event and one comment', async () => {
  const h = household();
  await h.owner.events.listEvents(h.groupId);
  h.loseNextAcknowledgement();
  const payload = plan(h.groupId);
  await assert.rejects(h.owner.events.createEvent(payload), /lost acknowledgement/);
  const [first, second] = await Promise.all([h.owner.events.createEvent(payload), h.owner.events.createEvent(payload)]);
  assert.equal(first.id, second.id);
  assert.equal((await h.partner.events.listEvents(h.groupId)).length, 1);
  h.loseNextAcknowledgement();
  await assert.rejects(h.partner.thread.sendMessage(first.id, 'Meet at the entrance.', 'repeat-comment'), /lost acknowledgement/);
  await h.partner.thread.sendMessage(first.id, 'Meet at the entrance.', 'repeat-comment');
  assert.equal((await h.owner.thread.listMessages(first.id)).length, 1);
});

test('virtual week: concurrent messages retain every actor and event association', async () => {
  const h = household();
  const event = await h.owner.events.createEvent(plan(h.groupId));
  const people = [h.owner, h.partner, h.relative];
  await Promise.all(Array.from({ length: 18 }, (_, i) => people[i % 3].thread.sendMessage(event.id, `Update ${i}`, `update-${i}`)));
  const messages = await h.as(h.ids[0]).thread.listMessages(event.id);
  assert.equal(messages.length, 18);
  assert.equal(new Set(messages.map((message) => message.id)).size, 18);
  for (let i = 0; i < 18; i++) assert.equal(messages.find((message) => message.body === `Update ${i}`).authorId, h.ids[i % 3]);
});

test('virtual week: failed edits preserve the committed plan and allow a visible retry', async () => {
  const h = household();
  const event = await h.owner.events.createEvent(plan(h.groupId));
  h.failNextWrite();
  await assert.rejects(h.owner.events.updateEvent(event.id, { location: 'Changed location' }), /storage unavailable/);
  assert.equal((await h.partner.events.getEvent(event.id)).location, event.location);
  await h.owner.events.updateEvent(event.id, { location: 'Changed location' });
  assert.equal((await h.as(h.ids[1]).events.getEvent(event.id)).location, 'Changed location');
});

test('virtual week: outsider and wrong-role actions cannot read or alter another family plan', async () => {
  const h = household();
  const event = await h.owner.events.createEvent(plan(h.groupId));
  await assert.rejects(h.outsider.events.getEvent(event.id), /access/);
  await assert.rejects(h.outsider.thread.sendMessage(event.id, 'Not a member', 'outsider'), /access/);
  await assert.rejects(h.partner.events.deleteEvent(event.id), /Only/);
  // The adapter deliberately ignores supplied identity and derives the actor.
  await h.partner.rsvps.upsertRsvp({ eventId: event.id, personId: h.ids[0], status: 'going' });
  assert.deepEqual((await h.owner.rsvps.listRsvps(event.id)).map((rsvp) => rsvp.personId), [h.ids[1]]);
  assert.equal((await h.owner.events.listEvents(h.groupId)).length, 1);
  assert.equal((await h.owner.thread.listMessages(event.id)).length, 0);
});

test('virtual week: a family arriving during an event still finds it on Home until it ends', async () => {
  const h = household();
  const event = await h.owner.events.createEvent(plan(h.groupId));
  const during = new Date('2026-09-14T22:00:00Z');
  const view = selectHomeViewModel({ events: [event], now: during });
  assert.equal(view.heroEvent?.id, event.id, 'An ongoing plan must not disappear when its start time passes');
  assert.equal(view.heroEvent.isOngoing, true);
  assert.equal(selectHomeViewModel({ events: [event], now: new Date('2026-09-14T23:00:01Z') }).heroEvent, null);
});

test('virtual week: Calendar does not mark this year with a same-month event from next year', async () => {
  const h = household();
  // Calendar renders in the viewer's timezone; use local dates for local-day assertions.
  const thisYear = await h.owner.events.createEvent({ ...plan(h.groupId, 14),
    startsAt: new Date(2026, 8, 14, 12).toISOString(), endsAt: new Date(2026, 8, 14, 14).toISOString() });
  const nextYear = await h.owner.events.createEvent({ ...plan(h.groupId, 20, 'next-year'),
    startsAt: new Date(2027, 8, 20, 12).toISOString(), endsAt: new Date(2027, 8, 20, 14).toISOString() });
  const view = selectCalendarViewModel([thisYear, nextYear], new Date('2026-09-13T12:00:00Z'));
  assert.equal(view.calendarEvents.find((day) => day.day === 14).highlight, true);
  assert.equal(view.calendarEvents.find((day) => day.day === 20).highlight, false);
  assert.equal(view.agenda.length, 2, 'The later event must remain available in the agenda');
});

test('virtual week: cancelling a populated event removes its dependent local records', async () => {
  const h = household();
  const event = await h.owner.events.createEvent(plan(h.groupId));
  await h.partner.rsvps.upsertRsvp({ eventId: event.id, status: 'going' });
  await h.partner.thread.sendMessage(event.id, 'Will bring snacks', 'snacks');
  await h.partner.media.uploadMedia({ eventId: event.id, fileUri: tinyPng, altText: 'Synthetic test photo' });
  await h.owner.events.deleteEvent(event.id);
  assert.equal(await h.as(h.ids[1]).events.getEvent(event.id), null);
  for (const collection of ['rsvps', 'messages', 'media', 'activity', 'memories', 'notifications', 'reminders', 'eventOperations', 'messageOperations']) {
    assert.equal(h.snapshot().database[collection].filter((item) => item.eventId === event.id).length, 0, collection);
  }
});
