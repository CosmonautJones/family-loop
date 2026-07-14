export type InvitationDraft = { email: string; token: string };

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function encodeInvitationToken(bytes: Uint8Array) {
  if (bytes.length !== 32) throw new Error('Invitation tokens require exactly 32 random bytes.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    token += alphabet[(chunk >>> 18) & 63] + alphabet[(chunk >>> 12) & 63];
    if (index + 1 < bytes.length) token += alphabet[(chunk >>> 6) & 63];
    if (index + 2 < bytes.length) token += alphabet[chunk & 63];
  }
  return token;
}

export function invitationDraftForEmail(current: InvitationDraft | null, email: string, randomBytes: () => Uint8Array) {
  const normalizedEmail = normalizeInvitationEmail(email);
  if (current?.email === normalizedEmail) return current;
  return { email: normalizedEmail, token: encodeInvitationToken(randomBytes()) };
}
