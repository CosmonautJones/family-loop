const invitationTokenPattern = /^[A-Za-z0-9_-]{42}[AQgw]$/;

export function parseInvitationToken(hash: string): string | null {
  const match = hash.match(/^#\/invite\/([^/?#]+)$/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return invitationTokenPattern.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function formatInvitationRoute(token: string): string {
  if (!invitationTokenPattern.test(token)) throw new Error('Invitation tokens must contain exactly 32 random bytes encoded as base64url.');
  return `#/invite/${token}`;
}

export function withoutInvitationRoute(hash: string): string {
  return parseInvitationToken(hash) ? '#/home' : hash;
}
