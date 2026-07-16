import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInvitationLink,
  buildInvitationText,
  buildResendRequest,
  invitationEmailSubject,
  invitationTokenToHex,
  parseAppOrigin,
  parseInvocationBody,
  parsePreparedDelivery,
  parseSender,
} from '../supabase/functions/send-group-invitation/core.mjs';

const invitationId = '5f2acb5b-5ddf-4b22-97a9-55a17e3ff30f';
const deliveryKey = 'ebfce09c-ded2-43b7-8872-49a11ac2a4cf';
const deliveryId = '20619265-a911-4a1c-8577-e5f15f3c73f2';
const token = 'A'.repeat(43);

test('server origin and sender validation is exact and header-safe', () => {
  assert.equal(parseAppOrigin('https://loopedin-family.netlify.app'), 'https://loopedin-family.netlify.app');
  assert.equal(parseAppOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  for (const invalid of ['http://loopedin-family.netlify.app', 'https://*.netlify.app', 'https://loopedin-family.netlify.app/path', 'https://user@example.com']) {
    assert.equal(parseAppOrigin(invalid), null);
  }
  assert.equal(parseSender('LoopedIn <invites@mail.example.com>'), 'LoopedIn <invites@mail.example.com>');
  assert.equal(parseSender('invites@mail.example.com'), 'invites@mail.example.com');
  assert.equal(parseSender('LoopedIn\nBcc: outsider@example.com <invites@mail.example.com>'), null);
});

test('invocation accepts only canonical token and exact bounded fields', () => {
  assert.deepEqual(parseInvocationBody({ invitationId, token, deliveryKey }), { invitationId, token, deliveryKey });
  assert.equal(parseInvocationBody({ invitationId, token: `${'A'.repeat(42)}B`, deliveryKey }), null);
  assert.equal(parseInvocationBody({ invitationId, token, deliveryKey, email: 'leak@example.com' }), null);
  assert.equal(invitationTokenToHex(token), '00'.repeat(32));
  assert.equal(invitationTokenToHex(`${'A'.repeat(42)}B`), null);
});

test('prepared RPC values are fail-closed and labels are flattened', () => {
  assert.deepEqual(parsePreparedDelivery({ ok: true, code: 'provider_accepted' }), { code: 'provider_accepted' });
  assert.deepEqual(parsePreparedDelivery({ ok: false, code: 'cooldown', retryAfterSeconds: 60 }), { code: 'try_later' });
  assert.deepEqual(parsePreparedDelivery({ ok: false, code: 'rate_limited' }), { code: 'try_later' });
  assert.deepEqual(parsePreparedDelivery({ ok: true, code: 'prepared', deliveryId, inviteeEmail: 'family@example.com', groupName: 'Jones\nFam', inviterName: 'Travis\r\nJones' }), {
    code: 'prepared', deliveryId, inviteeEmail: 'family@example.com', groupName: 'Jones Fam', inviterName: 'Travis Jones',
  });
  assert.deepEqual(parsePreparedDelivery({ ok: true, code: 'prepared', deliveryId, inviteeEmail: 'bad address' }), { code: 'unavailable' });
});

test('Resend request is text-only, static-subject, idempotent, and contains no tracking fields', () => {
  const invitationLink = buildInvitationLink('https://loopedin-family.netlify.app', token);
  assert.equal(invitationLink, `https://loopedin-family.netlify.app/#/invite/${token}`);
  const text = buildInvitationText({ inviterName: 'Travis', groupName: 'Jones Fam', invitationLink });
  const request = buildResendRequest({
    apiKey: 're_test_only_not_a_secret', sender: 'LoopedIn <invites@mail.example.com>', recipient: 'family@example.com', text, deliveryId,
  });
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.init.headers['Idempotency-Key'], `loopedin-invitation-${deliveryId}`);
  const body = JSON.parse(request.init.body);
  assert.deepEqual(Object.keys(body).sort(), ['from', 'subject', 'text', 'to']);
  assert.equal(body.subject, invitationEmailSubject);
  assert.equal(body.html, undefined);
  assert.match(body.text, new RegExp(`/#/invite/${token}`));
  assert.doesNotMatch(body.text, /utm_|pixel|track/i);
});
