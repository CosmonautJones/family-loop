import assert from 'node:assert/strict';
import test from 'node:test';

async function preflight(origin, release, respond) {
  const saved = [process.env.LOOPEDIN_QA_APP_ORIGIN, process.env.LOOPEDIN_QA_RELEASE_ID, globalThis.fetch];
  let calls = 0;
  try {
    process.env.LOOPEDIN_QA_APP_ORIGIN = origin;
    if (release === undefined) delete process.env.LOOPEDIN_QA_RELEASE_ID;
    else process.env.LOOPEDIN_QA_RELEASE_ID = release;
    globalThis.fetch = async (...args) => { calls++; return respond(...args); };
    const helper = await import(`./hosted-browser-data-export.mjs?case=${Math.random()}`);
    await helper.verifyHostedRelease();
    return calls;
  } finally {
    for (const [name, value] of [['LOOPEDIN_QA_APP_ORIGIN', saved[0]], ['LOOPEDIN_QA_RELEASE_ID', saved[1]]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    globalThis.fetch = saved[2];
  }
}

test('hosted family QA refuses an unrelated origin or missing release before network access', async () => {
  const noFetch = () => assert.fail('invalid target must not reach the network');
  await assert.rejects(preflight('https://unrelated.netlify.app', '0.1.0-123456789abc', noFetch), /dedicated site/);
  await assert.rejects(preflight('https://loopedin-family.netlify.app', undefined, noFetch), /explicit candidate/);
});

test('hosted family QA rejects stale served release before reading runtime or creating fixtures', async () => {
  let calls = 0;
  await assert.rejects(preflight('https://loopedin-family.netlify.app', '0.1.0-123456789abc', () => {
    calls++;
    return new Response('', { headers: { 'x-loopedin-release': '0.1.0-abcdef123456' } });
  }), /release mismatch/);
  assert.equal(calls, 1);
});

test('hosted family QA accepts an exact immutable deploy and rejects another backend', async () => {
  const origin = 'https://123456789abcdef123456789--loopedin-family.netlify.app';
  const release = '0.1.0-123456789abc';
  const respond = (backend) => (url) => url.endsWith('/runtime-config.json')
    ? Response.json({ environmentId: 'loopedin-staging', supabaseUrl: backend, supabasePublishableKey: 'sb_publishable_test' }, { headers: { 'cache-control': 'no-store' } })
    : new Response('', { headers: { 'x-loopedin-release': release, 'x-loopedin-environment': 'loopedin-staging' } });
  assert.equal(await preflight(origin, release, respond('https://vkogznsfthirhxkqysza.supabase.co')), 2);
  await assert.rejects(preflight(origin, release, respond('https://other.supabase.co')));
});
