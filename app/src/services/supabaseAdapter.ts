import type { Event, EventActivity, EventMessage, Group, GroupMember, MediaItem, Person, RSVP } from '../types/domain';
import type {
  AuthSession,
  AuthSignUpResult,
  AccountDeletionStatus,
  CreatedGroupInvitation,
  CreateEventPayload,
  CreateGroupPayload,
  CreateRsvpPayload,
  LoopedInService,
  GroupActionResult,
  GroupActionStatus,
  GroupInvitation,
  GroupInvitationPreview,
  InvitationEmailResult,
  MediaUploadPayload,
  NotificationItem,
  ReminderPreference,
  UpdateEventPayload,
} from './api';
import { getSupabaseClient } from './supabaseClient';
import { maxBrowserImageBytes, validateMediaUpload } from './mediaValidation';
import type { Session } from '@supabase/supabase-js';
import { updateEventLocationTimeline } from '../features/events/createEvent';
import { isCanonicalInvitationToken, isReadyInvitationEmailMatch, resolveWithFallback } from '../features/auth/invitationRoute';
import { backendServiceError, userServiceError, withSafeServiceErrors } from './serviceErrors';
import { subscribeToEventMessages } from './messageSubscription';
import { createClientErrorTelemetryReporter } from './clientErrorTelemetry';
import { getReleaseId, getRuntimeConfig } from '../config/runtimeConfig';

type GroupRow = {
  id: string;
  name: string;
  description: string;
  kind: Group['kind'];
  cover_url: string | null;
};

type EventRow = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  description: string;
  status_label: string;
  visibility: 'group';
  timeline: unknown;
  cover_url: string | null;
};

type RsvpRow = {
  event_id: string;
  user_id: string;
  person_name: string;
  status: RSVP['status'];
  note: string | null;
};

type MessageRow = {
  id: string;
  event_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type MediaRow = {
  id: string;
  event_id: string;
  storage_path: string;
  caption: string;
  alt_text: string;
  source_name: string | null;
  source_url: string | null;
  creator_name: string | null;
  creator_url: string | null;
  uploaded_by: string;
  uploaded_at: string;
  status: 'pending' | 'active' | 'deleting';
  delete_requested_by: string | null;
  delete_requested_at: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationItem['kind'];
  title: string;
  body: string;
  event_id: string | null;
  group_id: string | null;
  read: boolean;
  created_at: string;
};

type ReminderRow = {
  event_id: string;
  user_id: string;
  enabled: boolean;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type GroupMemberRow = {
  user_id: string;
  role: GroupMember['role'];
};

type InvitationRow = {
  id: string;
  invitee_email: string;
  status: GroupInvitation['status'];
  expires_at: string;
  created_at: string;
};

type RpcResult = {
  ok?: boolean;
  code?: string;
  groupId?: string;
  groupName?: string;
  inviterName?: string;
  maskedEmail?: string;
  expiresAt?: string;
  invitationId?: string;
};

const mediaBucket = 'loopedin-event-media';

let clientErrorTelemetryReporter: ReturnType<typeof createClientErrorTelemetryReporter> | null = null;

function getClientErrorTelemetryReporter() {
  if (clientErrorTelemetryReporter) return clientErrorTelemetryReporter;
  const config = getRuntimeConfig();
  clientErrorTelemetryReporter = createClientErrorTelemetryReporter(config.environmentId, getReleaseId(), async (event) => {
    const { error } = await getSupabaseClient().rpc('loopedin_report_client_error', {
      target_operation: event.operation,
      target_category: event.category,
      target_release: event.release,
    });
    if (error) throw error;
  });
  return clientErrorTelemetryReporter;
}

export function reportRenderErrorTelemetry() {
  try {
    if (getRuntimeConfig().dataMode !== 'supabase') return;
    getClientErrorTelemetryReporter()({ operation: 'render', category: 'render' });
  } catch {
    // Telemetry must never interfere with recovery UI.
  }
}

function sessionWithoutProfile(session: Session, displayName?: string): AuthSession {
  return {
    userId: session.user.id,
    displayName: displayName ?? session.user.email?.split('@')[0] ?? 'You',
    token: session.access_token,
    expiresAt: new Date((session.expires_at ?? 0) * 1000).toISOString(),
  };
}

async function mapSession(session: Session): Promise<AuthSession> {
  const profiles = await getProfiles([session.user.id]);
  return sessionWithoutProfile(session, profiles.get(session.user.id)?.display_name);
}

function throwIfError(error: { message: string } | null) {
  if (error) throw backendServiceError(error);
}

function mapAccountDeletionStatus(value: unknown): AccountDeletionStatus | null {
  if (value === null) return null;
  const row = value as Partial<AccountDeletionStatus>;
  if (row.status !== 'pending' || !row.requestedAt || !row.purgeAfter || !row.backupExpiresAfter) {
    throw backendServiceError(new Error('Invalid account deletion status.'));
  }
  return row as AccountDeletionStatus;
}

function invitationTokenToHex(token: string) {
  if (!isCanonicalInvitationToken(token)) throw userServiceError('This invitation can’t be used. Ask the person who invited you for a new link.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of token) {
    buffer = (buffer << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  if (bytes.length !== 32) throw userServiceError('This invitation can’t be used. Ask the person who invited you for a new link.');
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireRpcSuccess(data: unknown, allowedStatuses: readonly GroupActionStatus[]): RpcResult & { code: GroupActionStatus } {
  const result = (data ?? {}) as RpcResult;
  if (!result.ok || !allowedStatuses.includes(result.code as GroupActionStatus)) throw userServiceError('That family action isn’t available.');
  return result as RpcResult & { code: GroupActionStatus };
}

async function fetchValidatedMediaBlob(fileUri: string) {
  const response = await fetch(fileUri);
  if (!response.ok) throw userServiceError('The photo could not be downloaded. Check the link and try again.');

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > maxBrowserImageBytes) throw userServiceError('Choose an image no larger than 1 MB.');

  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBrowserImageBytes) {
        await reader.cancel();
        throw userServiceError('Choose an image no larger than 1 MB.');
      }
      chunks.push(value);
    }
  }

  const blob = chunks.length ? new Blob(chunks, { type: contentType }) : await response.blob();
  const mime = (blob.type || contentType).toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    throw userServiceError('Choose a JPEG, PNG, or WebP image.');
  }
  if (!blob.size || blob.size > maxBrowserImageBytes) throw userServiceError('Choose an image no larger than 1 MB.');

  const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => signature[index] === byte);
  const webp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if ((mime === 'image/jpeg' && !jpeg) || (mime === 'image/png' && !png) || (mime === 'image/webp' && !webp)) {
    throw userServiceError('The selected file does not contain a valid image.');
  }
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob);
      const validDimensions = image.width > 0 && image.height > 0;
      image.close();
      if (!validDimensions) throw userServiceError('empty image');
    } catch {
      throw userServiceError('The selected image could not be decoded.');
    }
  }
  return blob.type === mime ? blob : new Blob([blob], { type: mime });
}

function getTimeline(value: unknown): Event['timeline'] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Event['timeline'][number] => {
    return Boolean(item && typeof item === 'object' && 'title' in item && 'detail' in item);
  });
}

function mapGroup(row: GroupRow, memberCount = 1): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    badge: row.kind === 'family' ? 'Family' : 'Friends',
    tone: row.kind === 'family' ? 'coral' : 'sky',
    memberCount,
    coverUri: row.cover_url ?? undefined,
  };
}

function mapProfile(profile: ProfileRow): Person {
  return {
    id: profile.id,
    name: profile.display_name,
    avatarUri: profile.avatar_url ?? '',
    initials: profile.display_name.slice(0, 2).toUpperCase(),
  };
}

function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    groupId: row.group_id,
    creatorId: row.created_by,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    description: row.description,
    statusLabel: row.status_label,
    visibility: row.visibility,
    timeline: getTimeline(row.timeline),
    coverUri: row.cover_url ?? undefined,
  };
}

function mapRsvp(row: RsvpRow): RSVP {
  return {
    eventId: row.event_id,
    personId: row.user_id,
    personName: row.person_name,
    status: row.status,
    note: row.note ?? undefined,
  };
}

function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    eventId: row.event_id ?? undefined,
    groupId: row.group_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

function mapReminder(row: ReminderRow): ReminderPreference {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    timing: 'morning_of_event',
    enabled: true,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow, profile?: ProfileRow, self = false): EventMessage {
  return {
    id: row.id,
    eventId: row.event_id,
    body: row.body,
    authorName: profile?.display_name ?? 'Family member',
    authorId: row.author_id,
    author: profile
      ? {
          id: profile.id,
          name: profile.display_name,
          avatarUri: profile.avatar_url ?? '',
          initials: profile.display_name.slice(0, 2).toUpperCase(),
        }
      : undefined,
    self,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  if (!data.user) throw userServiceError('You must be signed in.');
  return data.user.id;
}

async function getProfiles(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return new Map<string, ProfileRow>();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('loopedin_profiles')
    .select('id, display_name, avatar_url')
    .in('id', uniqueIds);
  throwIfError(error);

  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
}

async function countMembers(groupIds: string[]) {
  const uniqueIds = [...new Set(groupIds)];
  if (!uniqueIds.length) return new Map<string, number>();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('loopedin_group_members').select('group_id').in('group_id', uniqueIds);
  throwIfError(error);

  return (data ?? []).reduce((counts, row) => {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function createSignedMediaUrl(storagePath: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(mediaBucket).createSignedUrl(storagePath, 3600);
  throwIfError(error);
  return data?.signedUrl ?? storagePath;
}

async function mapMedia(row: MediaRow): Promise<MediaItem> {
  return {
    id: row.id,
    eventId: row.event_id,
    uri: await createSignedMediaUrl(row.storage_path),
    caption: row.caption,
    altText: row.alt_text,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    creatorName: row.creator_name ?? undefined,
    creatorUrl: row.creator_url ?? undefined,
  };
}

function eventInsert(payload: CreateEventPayload, userId: string) {
  return {
    group_id: payload.groupId,
    title: payload.title,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    location: payload.location,
    description: payload.description,
    status_label: 'Open',
    visibility: 'group',
    cover_url: payload.coverUri ?? null,
    created_by: userId,
    timeline: [
      { title: 'Logistics', detail: `${payload.location} details are ready to share.` },
      { title: 'Conversation', detail: 'Chat, reminders, and media attach to this event.' },
    ],
  };
}

function eventPatch(patch: UpdateEventPayload, timeline?: Event['timeline']) {
  return {
    title: patch.title,
    starts_at: patch.startsAt,
    ends_at: patch.endsAt,
    location: patch.location,
    description: patch.description,
    cover_url: patch.coverUri,
    ...(timeline ? { timeline } : {}),
  };
}

export function createSupabaseLoopedInService(): LoopedInService {
  const supabase = getSupabaseClient();

  async function reconcileMediaOperations(eventId: string) {
    const { data, error } = await supabase.rpc('loopedin_list_media_operations', { target_event_id: eventId });
    throwIfError(error);
    const now = Date.now();

    for (const operation of (data ?? []) as MediaRow[]) {
      if (operation.status === 'pending') {
        const { data: activated } = await supabase
          .rpc('loopedin_activate_media', { target_media_id: operation.id })
          .single();
        if (!activated && now - new Date(operation.uploaded_at).getTime() >= 5 * 60 * 1000) {
          await supabase.rpc('loopedin_abort_media_upload', { target_media_id: operation.id });
        }
        continue;
      }

      const { data: claimed } = await supabase
        .rpc('loopedin_claim_media_deletion', { target_media_id: operation.id })
        .single();
      if (!claimed) continue;
      const claimedMedia = claimed as MediaRow;
      const { error: removeError } = await supabase.storage.from(mediaBucket).remove([claimedMedia.storage_path]);
      if (!removeError) await supabase.rpc('loopedin_finalize_media_deletion', { target_media_id: operation.id });
    }
  }

  async function requireAccessibleEvent(eventId: string) {
    const { data, error } = await supabase.from('loopedin_events').select('id').eq('id', eventId).maybeSingle();
    throwIfError(error);
    if (!data) throw userServiceError('You don’t have access to that event.');
  }

  const service: LoopedInService = {
    auth: {
      async login(email, password): Promise<AuthSession> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session || !data.user) throw userServiceError('Email or password not recognized.');

        return mapSession(data.session).catch(() => sessionWithoutProfile(data.session!));
      },
      async signUp(invitationToken, displayName, email, password): Promise<AuthSignUpResult> {
        const name = displayName.trim();
        if (!name || name.length > 80) throw userServiceError('Enter a display name between 1 and 80 characters.');
        const token = invitationTokenToHex(invitationToken);
        const { data: invitation, error: invitationError } = await supabase.rpc('loopedin_match_group_invite_email', { target_token: token, target_email: email.trim() });
        if (invitationError || !isReadyInvitationEmailMatch(invitation)) throw userServiceError('This invitation can’t be used. Ask the person who invited you for a new link.');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw userServiceError('We couldn’t create your account. Try again or ask for a new invitation.');
        if (!data.session) return { status: 'confirmationRequired' };
        return { status: 'authenticated', session: sessionWithoutProfile(data.session, name) };
      },
      async requestPasswordReset(email, redirectTo) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error?.status === 429) throw backendServiceError(error);
        if (error && (error.status === 0 || error.name === 'AuthRetryableFetchError' || /failed to fetch|network request failed|load failed|networkerror|fetch failed/i.test(error.message))) {
          throw backendServiceError(new TypeError('Network request failed'));
        }
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error?.status === 429 || (error && (error.status === 0 || error.name === 'AuthRetryableFetchError' || /failed to fetch|network request failed|load failed|networkerror|fetch failed/i.test(error.message)))) {
          throw error?.status === 429 ? backendServiceError(error) : backendServiceError(new TypeError('Network request failed'));
        }
        if (error) throw userServiceError('This reset link is no longer valid. Request a new one.');
      },
      async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw userServiceError('Unable to sign out. Try again.');
      },
      async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw userServiceError('Unable to restore your session.');
        return data.session ? await mapSession(data.session).catch(() => sessionWithoutProfile(data.session!)) : null;
      },
      onAuthStateChange(listener) {
        let generation = 0;
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const current = ++generation;
          if (!session) listener(null, false);
          else void resolveWithFallback(mapSession(session), sessionWithoutProfile(session)).then((mapped) => {
            if (current === generation) listener(mapped, event === 'PASSWORD_RECOVERY');
          });
        });
        return () => data.subscription.unsubscribe();
      },
      async refreshSession(): Promise<AuthSession> {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session || !data.user) throw userServiceError('Unable to refresh your session. Sign in again.');

        return mapSession(data.session).catch(() => sessionWithoutProfile(data.session!));
      },
      async listLocalProfiles() {
        return [];
      },
      async chooseLocalProfile() {
        throw userServiceError('Local profile selection is unavailable in Supabase mode.');
      },
    },
    groups: {
      async listGroups() {
        const { data, error } = await supabase
          .from('loopedin_groups')
          .select('id, name, description, kind, cover_url')
          .order('updated_at', { ascending: false });
        throwIfError(error);

        const groups = (data ?? []) as GroupRow[];
        const counts = await countMembers(groups.map((group) => group.id));
        return groups.map((group) => mapGroup(group, counts.get(group.id) ?? 1));
      },
      async listGroupMembers(groupId) {
        const { data, error } = await supabase
          .from('loopedin_group_members')
          .select('user_id, role')
          .eq('group_id', groupId);
        throwIfError(error);

        const memberships = (data ?? []) as GroupMemberRow[];
        const userIds = memberships.map((membership) => membership.user_id);
        const profiles = await getProfiles(userIds);
        return memberships.flatMap((membership) => {
          const profile = profiles.get(membership.user_id);
          return profile ? [{ ...mapProfile(profile), role: membership.role }] : [];
        });
      },
      async getGroup(groupId) {
        const { data, error } = await supabase
          .from('loopedin_groups')
          .select('id, name, description, kind, cover_url')
          .eq('id', groupId)
          .maybeSingle();
        throwIfError(error);
        if (!data) return null;

        const counts = await countMembers([groupId]);
        return mapGroup(data as GroupRow, counts.get(groupId) ?? 1);
      },
      async createGroup(payload: CreateGroupPayload) {
        const { data, error } = await supabase
          .rpc('loopedin_create_group', {
            target_name: payload.name,
            target_description: payload.description,
            target_kind: payload.kind,
            target_creation_key: payload.creationKey,
          })
          .single();
        throwIfError(error);
        if (!data) throw userServiceError('We couldn’t create that family. Try again.');
        return mapGroup(data as GroupRow, 1);
      },
      async canCreateGroup() {
        const { data, error } = await supabase.rpc('loopedin_can_create_group');
        throwIfError(error);
        return data === true;
      },
      async validateInvitation(token): Promise<GroupInvitationPreview> {
        const { data, error } = await supabase.rpc('loopedin_validate_group_invite', { target_token: invitationTokenToHex(token) });
        throwIfError(error);
        const result = (data ?? {}) as RpcResult;
        if (!result.ok || !result.groupId || !result.groupName || !result.inviterName || !result.maskedEmail || !result.expiresAt) return { status: 'unavailable' };
        return { status: 'ready', groupId: result.groupId, groupName: result.groupName, inviterName: result.inviterName, maskedEmail: result.maskedEmail, expiresAt: result.expiresAt };
      },
      async acceptInvitation(token): Promise<GroupActionResult> {
        const { data, error } = await supabase.rpc('loopedin_accept_group_invite', { target_token: invitationTokenToHex(token) });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['joined']);
        if (!result.groupId) throw userServiceError('That family action isn’t available.');
        return { status: result.code, groupId: result.groupId };
      },
      async declineInvitation(token): Promise<GroupActionResult> {
        const { data, error } = await supabase.rpc('loopedin_decline_group_invite', { target_token: invitationTokenToHex(token) });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['declined']);
        return { status: result.code };
      },
      async createInvitation(groupId, email, token): Promise<CreatedGroupInvitation> {
        const { data, error } = await supabase.rpc('loopedin_create_group_invite', { target_group_id: groupId, target_email: email, target_token: invitationTokenToHex(token) });
        throwIfError(error);
        const rpcResult = (data ?? {}) as RpcResult;
        if (!rpcResult.ok && rpcResult.code === 'already_pending') throw userServiceError('An invitation is already waiting for that email.');
        if (!rpcResult.ok) throw userServiceError('That family action isn’t available.');
        const result = rpcResult;
        if (!result.invitationId || !result.expiresAt || (result.code !== 'created' && result.code !== 'existing')) throw userServiceError('That family action isn’t available.');
        return { invitationId: result.invitationId, expiresAt: result.expiresAt, status: result.code };
      },
      async emailInvitation(invitationId, token, deliveryKey): Promise<InvitationEmailResult> {
        if (!isCanonicalInvitationToken(token)) throw userServiceError('That invitation email isn’t available. The private link still works.');
        const { data, error } = await supabase.functions.invoke('send-group-invitation', {
          body: { invitationId, token, deliveryKey },
        });
        if (error || data?.status !== 'provider_accepted') {
          throw userServiceError('We couldn’t queue the invitation email. The private link still works.');
        }
        return { status: 'providerAccepted' };
      },
      async listInvitations(groupId) {
        const { data, error } = await supabase.rpc('loopedin_list_group_invites', { target_group_id: groupId });
        throwIfError(error);
        return ((data ?? []) as InvitationRow[]).map((invitation) => ({ id: invitation.id, email: invitation.invitee_email, status: invitation.status, expiresAt: invitation.expires_at, createdAt: invitation.created_at }));
      },
      async revokeInvitation(invitationId) {
        const { data, error } = await supabase.rpc('loopedin_revoke_group_invite', { target_invitation_id: invitationId });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['revoked']);
        return { status: result.code };
      },
      async removeMember(groupId, userId) {
        const { data, error } = await supabase.rpc('loopedin_remove_group_member', { target_group_id: groupId, target_user_id: userId });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['removed', 'not_member']);
        return { status: result.code };
      },
      async leaveGroup(groupId) {
        const { data, error } = await supabase.rpc('loopedin_leave_group', { target_group_id: groupId });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['left', 'not_member']);
        return { status: result.code };
      },
      async transferOwnership(groupId, userId) {
        const { data, error } = await supabase.rpc('loopedin_transfer_group_ownership', { target_group_id: groupId, target_user_id: userId });
        throwIfError(error);
        const result = requireRpcSuccess(data, ['transferred', 'already_owner']);
        return { status: result.code };
      },
      async updateGroup(groupId, patch) {
        void groupId; void patch;
        throw userServiceError('Group editing is unavailable in this release.');
      },
      async deleteGroup(groupId) {
        void groupId;
        throw userServiceError('Group deletion is unavailable in this release.');
      },
    },
    events: {
      async listEvents(groupId) {
        let query = supabase
          .from('loopedin_events')
          .select('id, group_id, created_by, title, starts_at, ends_at, location, description, status_label, visibility, timeline, cover_url')
          .order('starts_at', { ascending: true });
        if (groupId) query = query.eq('group_id', groupId);

        const { data, error } = await query;
        throwIfError(error);
        return ((data ?? []) as EventRow[]).map(mapEvent);
      },
      async getEvent(eventId) {
        const { data, error } = await supabase
          .from('loopedin_events')
          .select('id, group_id, created_by, title, starts_at, ends_at, location, description, status_label, visibility, timeline, cover_url')
          .eq('id', eventId)
          .maybeSingle();
        throwIfError(error);
        return data ? mapEvent(data as EventRow) : null;
      },
      async createEvent(payload: CreateEventPayload) {
        const userId = await getCurrentUserId();
        const insert = eventInsert(payload, userId);
        const { data, error } = await supabase
          .rpc('loopedin_create_event', {
            target_group_id: insert.group_id, target_title: insert.title, target_starts_at: insert.starts_at,
            target_ends_at: insert.ends_at, target_location: insert.location, target_description: insert.description,
            target_status_label: insert.status_label, target_visibility: insert.visibility, target_timeline: insert.timeline,
            target_cover_url: insert.cover_url, target_operation_key: payload.operationKey,
          }).single();
        throwIfError(error);
        return mapEvent(data as EventRow);
      },
      async updateEvent(eventId, patch) {
        let timeline: Event['timeline'] | undefined;
        if (patch.location) {
          const { data: current, error: currentError } = await supabase
            .from('loopedin_events')
            .select('timeline')
            .eq('id', eventId)
            .single();
          throwIfError(currentError);
          timeline = updateEventLocationTimeline(getTimeline(current?.timeline), patch.location);
        }
        const { data, error } = await supabase
          .from('loopedin_events')
          .update(eventPatch(patch, timeline))
          .eq('id', eventId)
          .select('id, group_id, created_by, title, starts_at, ends_at, location, description, status_label, visibility, timeline, cover_url')
          .single();
        throwIfError(error);
        return mapEvent(data as EventRow);
      },
      async deleteEvent(eventId) {
        const { data: media, error: mediaError } = await supabase
          .from('loopedin_event_media')
          .select('id')
          .eq('event_id', eventId)
          .limit(1);
        throwIfError(mediaError);
        if (media?.length) throw userServiceError('Remove this event’s photos before canceling the plan.');
        const { data, error } = await supabase.from('loopedin_events').delete().eq('id', eventId).select('id');
        throwIfError(error);
        if (!data?.some((row) => row.id === eventId)) throw userServiceError('The plan was not deleted. Check your access and try again.');
      },
    },
    rsvps: {
      async listRsvps(eventId) {
        const { data, error } = await supabase
          .from('loopedin_rsvps')
          .select('event_id, user_id, person_name, status, note')
          .eq('event_id', eventId);
        throwIfError(error);
        return ((data ?? []) as RsvpRow[]).map(mapRsvp);
      },
      async upsertRsvp(payload: CreateRsvpPayload) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        throwIfError(userError);
        if (!userData.user) throw userServiceError('You must be signed in.');
        const userId = userData.user.id;
        const profiles = await getProfiles([userId]);
        const personName = profiles.get(userId)?.display_name ?? userData.user.email?.split('@')[0] ?? 'You';
        const { data, error } = await supabase
          .from('loopedin_rsvps')
          .upsert({
            event_id: payload.eventId,
            user_id: userId,
            person_name: personName,
            status: payload.status,
            note: payload.note ?? null,
          })
          .select('event_id, user_id, person_name, status, note')
          .single();
        throwIfError(error);
        return mapRsvp(data as RsvpRow);
      },
      async updateRsvp(eventId, personId, patch) {
        const userId = await getCurrentUserId();
        if (personId !== userId) throw userServiceError('You can only change your own RSVP.');
        const { data, error } = await supabase
          .from('loopedin_rsvps')
          .update({ status: patch.status, note: patch.note ?? null })
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .select('event_id, user_id, person_name, status, note')
          .single();
        throwIfError(error);
        return mapRsvp(data as RsvpRow);
      },
      async deleteRsvp(eventId, personId) {
        const userId = await getCurrentUserId();
        if (personId !== userId) throw userServiceError('You can only remove your own RSVP.');
        const { error } = await supabase.from('loopedin_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
        throwIfError(error);
      },
    },
    activity: {
      async listRecentActivity(): Promise<EventActivity[]> {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_notifications')
          .select('id, user_id, kind, title, body, event_id, read, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12);
        throwIfError(error);

        return ((data ?? []) as NotificationRow[]).map((notification) => ({
          id: notification.id,
          eventId: notification.event_id ?? '',
          title: notification.title,
          detail: notification.body,
          badge: notification.kind.replace('_', ' '),
          tone: notification.read ? 'sage' : 'coral',
          createdAt: notification.created_at,
        }));
      },
    },
    thread: {
      subscribeMessages(eventId, onChange, onStatus) {
        return subscribeToEventMessages(supabase, eventId, onChange, onStatus);
      },
      async listMessages(eventId) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_event_messages')
          .select('id, event_id, author_id, body, created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });
        throwIfError(error);

        const messages = (data ?? []) as MessageRow[];
        const profiles = await getProfiles(messages.map((message) => message.author_id));
        return messages.map((message) => mapMessage(message, profiles.get(message.author_id), message.author_id === userId));
      },
      async sendMessage(eventId, body, operationKey) {
        const trimmedBody = body.trim();
        if (!trimmedBody) throw userServiceError('Write a message before sending.');
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .rpc('loopedin_send_event_message', { target_event_id: eventId, target_body: trimmedBody, target_operation_key: operationKey }).single();
        throwIfError(error);

        const profiles = await getProfiles([userId]);
        return mapMessage(data as MessageRow, profiles.get(userId), true);
      },
    },
    media: {
      async uploadMedia(payload: MediaUploadPayload) {
        validateMediaUpload(payload);
        const userId = await getCurrentUserId();
        const blob = await fetchValidatedMediaBlob(payload.fileUri);
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = `${payload.eventId}/${userId}/${crypto.randomUUID()}.${extension}`;

        const { data: pending, error: beginError } = await supabase
          .rpc('loopedin_begin_media_upload', {
            target_event_id: payload.eventId,
            target_storage_path: storagePath,
            target_caption: payload.caption?.trim() ?? '',
            target_alt_text: payload.altText.trim(),
            target_source_name: payload.sourceName?.trim() || null,
            target_source_url: payload.sourceUrl?.trim() || null,
            target_creator_name: payload.creatorName?.trim() || null,
            target_creator_url: payload.creatorUrl?.trim() || null,
          })
          .single();
        if (beginError) throw backendServiceError(beginError);
        if (!pending) throw userServiceError('The photo upload could not be started.');
        const pendingMedia = pending as MediaRow;

        const { error: uploadError } = await supabase.storage
          .from(mediaBucket)
          .upload(storagePath, blob, { contentType: blob.type, upsert: false });
        if (uploadError) {
          const { data: recovered } = await supabase.rpc('loopedin_activate_media', { target_media_id: pendingMedia.id }).single();
          if (recovered) return mapMedia(recovered as MediaRow);
          const { data: aborted } = await supabase.rpc('loopedin_abort_media_upload', { target_media_id: pendingMedia.id });
          if (aborted === true) throw userServiceError('The photo file was not uploaded. No incomplete photo was kept. Try again.');
          throw userServiceError('The photo upload is incomplete and remains available for reconciliation. Try again.');
        }

        const { data, error: activationError } = await supabase
          .rpc('loopedin_activate_media', { target_media_id: pendingMedia.id })
          .single();
        if (activationError || !data) throw userServiceError('The photo file is safe, but activation is pending reconciliation. Try again.');
        return mapMedia(data as MediaRow);
      },
      async listMedia(eventId) {
        await reconcileMediaOperations(eventId);
        const { data, error } = await supabase
          .from('loopedin_event_media')
          .select('id, event_id, storage_path, caption, alt_text, source_name, source_url, creator_name, creator_url, uploaded_by, uploaded_at')
          .eq('event_id', eventId)
          .eq('status', 'active')
          .order('uploaded_at', { ascending: false });
        throwIfError(error);
        return Promise.all(((data ?? []) as MediaRow[]).map(mapMedia));
      },
      async deleteMedia(mediaId) {
        const { data: claimed, error: claimError } = await supabase
          .rpc('loopedin_claim_media_deletion', { target_media_id: mediaId })
          .single();
        if (claimError) throw backendServiceError(claimError);
        if (!claimed) throw userServiceError('The photo was not found or you no longer have access.');
        const claimedMedia = claimed as MediaRow;

        const { error: storageError } = await supabase.storage.from(mediaBucket).remove([claimedMedia.storage_path]);
        if (storageError) throw userServiceError('The private photo remains in a retryable deletion state. Try again.');

        const { data: finalized, error: finalizeError } = await supabase
          .rpc('loopedin_finalize_media_deletion', { target_media_id: mediaId });
        if (finalizeError || finalized !== true) throw userServiceError('The private file is gone, but cleanup remains retryable. Try again.');
      },
    },
    notifications: {
      async listNotifications() {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_notifications')
          .select('id, user_id, kind, title, body, event_id, group_id, read, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        throwIfError(error);
        return ((data ?? []) as NotificationRow[]).map(mapNotification);
      },
      async markRead(notificationId) {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from('loopedin_notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
        throwIfError(error);
      },
      async clearAll() {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from('loopedin_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
        throwIfError(error);
      },
    },
    reminders: {
      async getPreference(eventId) {
        await requireAccessibleEvent(eventId);
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_reminder_drafts')
          .select('event_id, user_id, enabled, updated_at')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('enabled', true)
          .maybeSingle();
        throwIfError(error);
        return data ? mapReminder(data as ReminderRow) : null;
      },
      async enablePreference(eventId) {
        await requireAccessibleEvent(eventId);
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_reminder_drafts')
          .upsert({ event_id: eventId, user_id: userId, remind_at: null, body: 'Morning of event', enabled: true }, { onConflict: 'event_id,user_id' })
          .select('event_id, user_id, enabled, updated_at')
          .single();
        throwIfError(error);
        return mapReminder(data as ReminderRow);
      },
      async disablePreference(eventId) {
        await requireAccessibleEvent(eventId);
        const userId = await getCurrentUserId();
        const { error } = await supabase.from('loopedin_reminder_drafts').delete().eq('event_id', eventId).eq('user_id', userId);
        throwIfError(error);
      },
    },
    accounts: {
      async getDeletionStatus() {
        const { data, error } = await supabase.rpc('loopedin_get_account_deletion_status');
        throwIfError(error);
        return mapAccountDeletionStatus(data);
      },
      async requestDeletion(password) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user?.email) throw userServiceError('Sign in again before deleting your account.');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password });
        if (signInError) throw userServiceError('Your password was not recognized. Your account was not changed.');
        const { data, error } = await supabase.rpc('loopedin_request_account_deletion');
        if (error?.message.includes('Transfer ownership')) throw userServiceError('Transfer ownership of every family before deleting your account.');
        if (error?.message.includes('Sign in again')) throw userServiceError('Sign in again before deleting your account.');
        throwIfError(error);
        const status = mapAccountDeletionStatus(data);
        if (!status) throw backendServiceError(new Error('Missing account deletion status.'));
        return status;
      },
      async cancelDeletion() {
        const { data, error } = await supabase.rpc('loopedin_cancel_account_deletion');
        if (error?.message.includes('recovery period')) throw userServiceError('The 30-day recovery period has ended.');
        throwIfError(error);
        if (data !== true) throw backendServiceError(new Error('Account deletion cancellation failed.'));
      },
    },
  };

  return withSafeServiceErrors(service, getClientErrorTelemetryReporter());
}
