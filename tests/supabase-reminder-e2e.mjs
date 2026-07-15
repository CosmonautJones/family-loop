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
const signIn = async (supabase, name) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email(name), password });
  assert.ifError(error);
  assert.ok(data.user);
  return data.user;
};
const readOwn = async (supabase, eventId) => {
  const { data, error } = await supabase.from('loopedin_reminder_drafts')
    .select('event_id,user_id,body,enabled,updated_at').eq('event_id', eventId);
  assert.ifError(error);
  return data;
};
const removeOwn = async (supabase, eventId) => {
  const { error } = await supabase.from('loopedin_reminder_drafts').delete().eq('event_id', eventId);
  assert.ifError(error);
};

let eventId;
let owner;
let maya;
let outsider;
try {
  owner = client();
  maya = client();
  outsider = client();
  const ownerUser = await signIn(owner, 'owner');
  const mayaUser = await signIn(maya, 'maya');
  const outsiderUser = await signIn(outsider, 'outsider');
  const { data: eventRows, error: eventError } = await owner.from('loopedin_events').select('id').order('starts_at').limit(1);
  assert.ifError(eventError);
  assert.equal(eventRows.length, 1);
  eventId = eventRows[0].id;
  await Promise.all([removeOwn(owner, eventId), removeOwn(maya, eventId)]);

  for (const [supabase, user] of [[owner, ownerUser], [maya, mayaUser]]) {
    const { data, error } = await supabase.from('loopedin_reminder_drafts').upsert({
      event_id: eventId, user_id: user.id, remind_at: null, body: 'Morning of event', enabled: true,
    }, { onConflict: 'event_id,user_id' }).select('event_id,user_id,body,enabled').single();
    assert.ifError(error);
    assert.deepEqual(data, { event_id: eventId, user_id: user.id, body: 'Morning of event', enabled: true });
  }

  assert.deepEqual((await readOwn(owner, eventId)).map((row) => row.user_id), [ownerUser.id]);
  assert.deepEqual((await readOwn(maya, eventId)).map((row) => row.user_id), [mayaUser.id]);

  await Promise.allSettled([owner.auth.signOut(), maya.auth.signOut()]);
  owner = client();
  maya = client();
  await signIn(owner, 'owner');
  await signIn(maya, 'maya');
  assert.equal((await readOwn(owner, eventId))[0].body, 'Morning of event');
  assert.equal((await readOwn(maya, eventId))[0].body, 'Morning of event');

  await removeOwn(owner, eventId);
  await removeOwn(owner, eventId);
  assert.equal((await readOwn(owner, eventId)).length, 0);
  assert.equal((await readOwn(maya, eventId)).length, 1, 'owner disable must not change Maya');

  const { data: outsiderEvent, error: outsiderEventError } = await outsider.from('loopedin_events').select('id').eq('id', eventId);
  assert.ifError(outsiderEventError);
  assert.equal(outsiderEvent.length, 0);
  const { error: outsiderWriteError } = await outsider.from('loopedin_reminder_drafts').insert({
    event_id: eventId, user_id: outsiderUser.id, body: 'Morning of event', enabled: true,
  });
  assert.ok(outsiderWriteError, 'outsider direct-ID insert must be denied by RLS');
  assert.equal((await readOwn(outsider, eventId)).length, 0);

  console.log('Local reminder PASS: users=2; sameEvent=isolated; relogin=retained; disable=idempotent; outsider=denied');
} finally {
  if (eventId) await Promise.allSettled([[owner, 'owner'], [maya, 'maya']].map(async ([supabase, name]) => {
    let cleanupClient = supabase;
    const { data } = await cleanupClient.auth.getSession();
    if (!data.session) {
      cleanupClient = client();
      await signIn(cleanupClient, name);
    }
    await removeOwn(cleanupClient, eventId);
    await cleanupClient.auth.signOut();
  }));
  await Promise.allSettled([owner?.auth.signOut(), maya?.auth.signOut(), outsider?.auth.signOut()]);
}
