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

export function invitationFlowId(token: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of token) {
    hash ^= BigInt(character.charCodeAt(0));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36);
}

export function createLatestResolutionGuard() {
  let generation = 0;
  return {
    begin() {
      const current = ++generation;
      return () => current === generation;
    },
    invalidate() {
      generation += 1;
    },
  };
}
