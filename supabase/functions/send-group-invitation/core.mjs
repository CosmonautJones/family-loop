export const invitationEmailSubject = "You're invited to LoopedIn";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAppOrigin(value) {
  if (typeof value !== 'string' || value.length > 200) return null;
  try {
    const url = new URL(value);
    const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))
      || (!loopback && !/^[a-z0-9.-]+$/i.test(url.hostname))
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parseSender(value) {
  if (typeof value !== 'string' || value.length < 3 || value.length > 160 || /[\r\n]/.test(value)) return null;
  const bracketed = value.match(/^([^<>]{1,80}) <([^<>]+)>$/);
  const address = bracketed ? bracketed[2] : value;
  return emailPattern.test(address) ? value : null;
}

export function parseInvocationBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'deliveryKey,invitationId,token') return null;
  const { deliveryKey, invitationId, token } = value;
  if (typeof deliveryKey !== 'string' || !uuidPattern.test(deliveryKey)
    || typeof invitationId !== 'string' || !uuidPattern.test(invitationId)
    || typeof token !== 'string' || !tokenPattern.test(token)) return null;
  return { deliveryKey, invitationId, token };
}

export function invitationTokenToHex(token) {
  if (!tokenPattern.test(token)) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const character of token) {
    const index = alphabet.indexOf(character);
    if (index < 0) return null;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  if (bytes.length !== 32) return null;
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeLabel(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return normalized ? normalized.slice(0, 120) : fallback;
}

export function parsePreparedDelivery(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { code: 'unavailable' };
  if (value.ok === true && value.code === 'provider_accepted') return { code: 'provider_accepted' };
  if (value.ok === false && (value.code === 'cooldown' || value.code === 'rate_limited')) return { code: 'try_later' };
  if (value.ok !== true || value.code !== 'prepared'
    || typeof value.deliveryId !== 'string' || !uuidPattern.test(value.deliveryId)
    || typeof value.inviteeEmail !== 'string' || !emailPattern.test(value.inviteeEmail)
    || value.inviteeEmail.length > 254) return { code: 'unavailable' };
  return {
    code: 'prepared',
    deliveryId: value.deliveryId,
    inviteeEmail: value.inviteeEmail,
    groupName: safeLabel(value.groupName, 'your family'),
    inviterName: safeLabel(value.inviterName, 'Your family organizer'),
  };
}

export function buildInvitationLink(appOrigin, token) {
  const origin = parseAppOrigin(appOrigin);
  if (!origin || !tokenPattern.test(token)) return null;
  return `${origin}/#/invite/${token}`;
}

export function buildInvitationText({ inviterName, groupName, invitationLink }) {
  const inviter = safeLabel(inviterName, 'Your family organizer');
  const group = safeLabel(groupName, 'your family');
  if (typeof invitationLink !== 'string' || invitationLink.length > 300) return null;
  return `${inviter} invited you to join ${group} on LoopedIn.\n\nAccept the invitation:\n${invitationLink}\n\nThis private link is tied to your email address and expires after seven days. If you did not expect this invitation, you can ignore this message.`;
}

export function buildResendRequest({ apiKey, sender, recipient, text, deliveryId }) {
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 300
    || !parseSender(sender) || !emailPattern.test(recipient) || recipient.length > 254
    || typeof text !== 'string' || text.length > 1200 || !uuidPattern.test(deliveryId)) return null;
  return {
    url: 'https://api.resend.com/emails',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `loopedin-invitation-${deliveryId}`,
      },
      body: JSON.stringify({ from: sender, to: [recipient], subject: invitationEmailSubject, text }),
    },
  };
}
