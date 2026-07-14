import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
assert.ok(url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url), 'SUPABASE_URL must be loopback');
assert.ok(key && password, 'Local publishable key and password are required');

const email = (name) => `browser-${name}-${marker}@loopedin.test`;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const owner = client();
const maya = client();
const outsider = client();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const eventually = async (predicate, label, timeout = 10_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${label}`);
};
const signIn = async (supabase, name) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email(name), password });
  assert.ifError(error);
  assert.ok(data.user);
  await supabase.realtime.setAuth(data.session.access_token);
  return data.user;
};
const subscribe = (supabase, eventId, onChange) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Channel did not subscribe for ${eventId}`)), 10_000);
  const channel = supabase.channel(`proof:${eventId}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loopedin_event_messages', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve(channel);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Channel failed with ${status}`));
      }
    });
});

let eventId;
const channels = [];
try {
  const ownerUser = await signIn(owner, 'owner');
  await signIn(maya, 'maya');
  await signIn(outsider, 'outsider');
  const { data: memberships, error: membershipError } = await owner.from('loopedin_group_members').select('group_id').eq('user_id', ownerUser.id).limit(1);
  assert.ifError(membershipError);
  assert.equal(memberships.length, 1);
  const { data: created, error: createError } = await owner.from('loopedin_events').insert({
    group_id: memberships[0].group_id,
    created_by: ownerUser.id,
    title: `Realtime proof ${marker}`,
    starts_at: '2027-08-01T15:00:00Z',
    ends_at: '2027-08-01T17:00:00Z',
    location: 'Local proof',
    description: 'Disposable exact-event realtime proof',
  }).select('id').single();
  assert.ifError(createError);
  eventId = created.id;

  let mayaEvents = 0;
  let outsiderEvents = 0;
  let otherEventEvents = 0;
  channels.push([maya, await subscribe(maya, eventId, () => { mayaEvents += 1; })]);
  channels.push([outsider, await subscribe(outsider, eventId, () => { outsiderEvents += 1; })]);
  const { data: otherEvents, error: otherError } = await maya.from('loopedin_events').select('id').neq('id', eventId).limit(1);
  assert.ifError(otherError);
  assert.equal(otherEvents.length, 1);
  channels.push([maya, await subscribe(maya, otherEvents[0].id, () => { otherEventEvents += 1; })]);

  const firstBody = `Realtime once ${marker}`;
  const { error: firstError } = await owner.from('loopedin_event_messages').insert({ event_id: eventId, author_id: ownerUser.id, body: firstBody });
  assert.ifError(firstError);
  await eventually(() => mayaEvents === 1, 'member receives Event A once');
  await wait(500);
  assert.equal(mayaEvents, 1);
  assert.equal(otherEventEvents, 0);
  assert.equal(outsiderEvents, 0);

  await maya.removeChannel(channels[0][1]);
  channels.shift();
  const missedBody = `Reconnect once ${marker}`;
  const { error: missedError } = await owner.from('loopedin_event_messages').insert({ event_id: eventId, author_id: ownerUser.id, body: missedBody });
  assert.ifError(missedError);
  assert.equal(mayaEvents, 1);
  channels.push([maya, await subscribe(maya, eventId, () => { mayaEvents += 1; })]);
  const { data: converged, error: convergeError } = await maya.from('loopedin_event_messages').select('id,body').eq('event_id', eventId).order('created_at').order('id');
  assert.ifError(convergeError);
  assert.deepEqual(converged.map((message) => message.body), [firstBody, missedBody]);
  assert.equal(new Set(converged.map((message) => message.id)).size, 2);

  console.log(`Local realtime PASS: memberEvents=${mayaEvents}; outsiderEvents=${outsiderEvents}; otherEventEvents=${otherEventEvents}; convergedMessages=${converged.length}`);
} finally {
  await Promise.allSettled(channels.map(([supabase, channel]) => supabase.removeChannel(channel)));
  if (eventId) {
    const { error } = await owner.from('loopedin_events').delete().eq('id', eventId);
    assert.ifError(error);
  }
  await Promise.allSettled([owner.auth.signOut(), maya.auth.signOut(), outsider.auth.signOut()]);
  assert.equal(maya.getChannels().length, 0);
  assert.equal(outsider.getChannels().length, 0);
}
