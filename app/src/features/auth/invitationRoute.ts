import type { GroupInvitationPreview } from '../../services/api';

const invitationTokenPattern = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

export function isCanonicalInvitationToken(token: string) {
  return invitationTokenPattern.test(token);
}

export function parseInvitationToken(hash: string): string | null {
  const match = hash.match(/^#\/invite\/([^/?#]+)$/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return isCanonicalInvitationToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function formatInvitationRoute(token: string): string {
  if (!isCanonicalInvitationToken(token)) throw new Error('Invitation tokens must contain exactly 32 random bytes encoded as base64url.');
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

export function isReadyInvitationEmailMatch(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === true && 'code' in value && value.code === 'ready');
}

type ReadyInvitationPreview = Extract<GroupInvitationPreview, { status: 'ready' }>;

export async function resolveInvitationSessionPreview(
  preview: ReadyInvitationPreview,
  sessionEmail: string | null | undefined,
  checkEmailMatch: (email: string) => Promise<boolean | undefined>,
  revalidateInvitation: () => Promise<GroupInvitationPreview | undefined>,
): Promise<GroupInvitationPreview> {
  if (!sessionEmail) return preview;
  const matches = await checkEmailMatch(sessionEmail);
  if (matches === undefined) return preview;
  if (matches) return { ...preview, sessionEmailMatchesInvite: true };
  const latestPreview = await revalidateInvitation();
  if (!latestPreview) return preview;
  return latestPreview.status === 'ready' ? { ...latestPreview, sessionEmailMatchesInvite: false } : latestPreview;
}

export function shouldOfferInvitationAccountSwitch(preview: GroupInvitationPreview | undefined): boolean {
  return preview?.status === 'ready' && preview.sessionEmailMatchesInvite === false;
}

export type InvitationSignUpOutcome<T> =
  | { status: 'authenticated'; session: T }
  | { status: 'confirmationOrSignInRequired' }
  | { status: 'existingAccount' }
  | { status: 'failed' };

export function isExistingAccountSignUpError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return code === 'user_already_exists' || /already registered|already exists|already been registered/i.test(message);
}

export function resolveInvitationSignUpOutcome<T>(response: {
  data: { session: T | null } | null;
  error: unknown;
}): InvitationSignUpOutcome<T> {
  if (response.error) return { status: isExistingAccountSignUpError(response.error) ? 'existingAccount' : 'failed' };
  if (!response.data?.session) return { status: 'confirmationOrSignInRequired' };
  return { status: 'authenticated', session: response.data.session };
}

export function resolveWithFallback<T>(primary: Promise<T>, fallback: T): Promise<T> {
  return primary.catch(() => fallback);
}
