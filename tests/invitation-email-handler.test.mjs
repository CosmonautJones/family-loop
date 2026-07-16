import assert from 'node:assert/strict';
import test from 'node:test';
import { runInvitationEmail } from '../supabase/functions/send-group-invitation/core.mjs';

const actorId = '83e052f9-124d-4da1-bcf3-e1f746390b11';
const invitationId = '5f2acb5b-5ddf-4b22-97a9-55a17e3ff30f';
const deliveryKey = 'ebfce09c-ded2-43b7-8872-49a11ac2a4cf';
const deliveryId = '20619265-a911-4a1c-8577-e5f15f3c73f2';
const token = 'A'.repeat(43);
const input = { actorId, invitationId, deliveryKey, token };
const base = {
  input,
  actorId,
  appOrigin: 'https://loopedin-family.netlify.app',
  sender: 'LoopedIn <invites@mail.example.com>',
  apiKey: 're_test_only_not_a_secret',
  prepare: async () => ({
    ok: true, code: 'prepared', deliveryId, inviteeEmail: 'recipient@example.com', groupName: 'Jones Fam', inviterName: 'Travis',
  }),
};

test('provider success finalizes through trusted actor parameters', async () => {
  let finalized;
  const result = await runInvitationEmail({
    ...base,
    send: async () => true,
    finalize: async (parameters) => {
      finalized = parameters;
      return { ok: true, code: 'provider_accepted' };
    },
  });
  assert.deepEqual(result, { httpStatus: 202, status: 'provider_accepted' });
  assert.equal(finalized.target_requested_by, actorId);
  assert.equal(finalized.target_delivery_id, deliveryId);
  assert.equal(finalized.target_outcome, 'provider_accepted');
});

test('provider failure is finalized without claiming delivery', async () => {
  let outcome;
  const result = await runInvitationEmail({
    ...base,
    send: async () => false,
    finalize: async (parameters) => {
      outcome = parameters.target_outcome;
      return { ok: true, code: outcome };
    },
  });
  assert.equal(outcome, 'provider_failed');
  assert.deepEqual(result, { httpStatus: 503, status: 'provider_unavailable' });
});

test('response-loss replay already accepted skips provider and finalize', async () => {
  let sends = 0;
  let finalizes = 0;
  const result = await runInvitationEmail({
    ...base,
    prepare: async () => ({ ok: true, code: 'provider_accepted' }),
    send: async () => { sends += 1; return true; },
    finalize: async () => { finalizes += 1; return { ok: true, code: 'provider_accepted' }; },
  });
  assert.deepEqual(result, { httpStatus: 202, status: 'provider_accepted' });
  assert.equal(sends, 0);
  assert.equal(finalizes, 0);
});

test('finalize failure fails closed after provider acceptance', async () => {
  const result = await runInvitationEmail({
    ...base,
    send: async () => true,
    finalize: async () => { throw new Error('mocked response loss'); },
  });
  assert.deepEqual(result, { httpStatus: 503, status: 'unavailable' });
});
