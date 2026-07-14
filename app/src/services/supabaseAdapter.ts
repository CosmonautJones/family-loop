import type { Event, EventActivity, EventMessage, Group, GroupMember, MediaItem, Person, RSVP } from '../types/domain';
import type {
  AuthSession,
  CreateEventPayload,
  CreateGroupPayload,
  CreateRsvpPayload,
  LoopedInService,
  MediaUploadPayload,
  NotificationItem,
  UpdateEventPayload,
} from './api';
import { getSupabaseClient } from './supabaseClient';
import { validateMediaUpload } from './mediaValidation';
import type { Session } from '@supabase/supabase-js';
import { updateEventLocationTimeline } from '../features/events/createEvent';

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
  caption: string | null;
  uploaded_by: string;
  uploaded_at: string;
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

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type GroupMemberRow = {
  user_id: string;
  role: GroupMember['role'];
};

const mediaBucket = 'loopedin-event-media';

async function mapSession(session: Session): Promise<AuthSession> {
  const profiles = await getProfiles([session.user.id]);
  return {
    userId: session.user.id,
    displayName: profiles.get(session.user.id)?.display_name ?? session.user.email?.split('@')[0] ?? 'You',
    token: session.access_token,
    expiresAt: new Date((session.expires_at ?? 0) * 1000).toISOString(),
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
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
  if (!data.user) throw new Error('You must be signed in.');
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
  const { data, error } = await supabase.storage.from(mediaBucket).createSignedUrl(storagePath, 60 * 60);
  throwIfError(error);
  return data?.signedUrl ?? storagePath;
}

async function mapMedia(row: MediaRow): Promise<MediaItem> {
  return {
    id: row.id,
    eventId: row.event_id,
    uri: await createSignedMediaUrl(row.storage_path),
    caption: row.caption ?? 'Shared moment',
    altText: row.caption ?? 'Shared family photo',
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
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

  return {
    auth: {
      async login(email, password): Promise<AuthSession> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        throwIfError(error);
        if (!data.session || !data.user) throw new Error('Supabase did not return a session.');

        const profiles = await getProfiles([data.user.id]);
        const profile = profiles.get(data.user.id);
        return {
          userId: data.user.id,
          displayName: profile?.display_name ?? data.user.email?.split('@')[0] ?? 'You',
          token: data.session.access_token,
          expiresAt: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
        };
      },
      async logout() {
        const { error } = await supabase.auth.signOut();
        throwIfError(error);
      },
      async getSession() {
        const { data, error } = await supabase.auth.getSession();
        throwIfError(error);
        return data.session ? await mapSession(data.session) : null;
      },
      onAuthStateChange(listener) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) listener(null);
          else void mapSession(session).then(listener).catch(() => listener(null));
        });
        return () => data.subscription.unsubscribe();
      },
      async refreshSession(): Promise<AuthSession> {
        const { data, error } = await supabase.auth.refreshSession();
        throwIfError(error);
        if (!data.session || !data.user) throw new Error('No active Supabase session.');

        const profiles = await getProfiles([data.user.id]);
        const profile = profiles.get(data.user.id);
        return {
          userId: data.user.id,
          displayName: profile?.display_name ?? data.user.email?.split('@')[0] ?? 'You',
          token: data.session.access_token,
          expiresAt: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
        };
      },
      async listLocalProfiles() {
        return [];
      },
      async chooseLocalProfile() {
        throw new Error('Local profile selection is unavailable in Supabase mode.');
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
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_groups')
          .insert({ ...payload, created_by: userId })
          .select('id, name, description, kind, cover_url')
          .single();
        throwIfError(error);
        if (!data) throw new Error('Supabase did not return the created group.');

        const { error: memberError } = await supabase
          .from('loopedin_group_members')
          .insert({ group_id: data.id, user_id: userId, role: 'owner' });
        throwIfError(memberError);

        return mapGroup(data as GroupRow, 1);
      },
      async updateGroup(groupId, patch) {
        const { data, error } = await supabase
          .from('loopedin_groups')
          .update(patch)
          .eq('id', groupId)
          .select('id, name, description, kind, cover_url')
          .single();
        throwIfError(error);

        const counts = await countMembers([groupId]);
        return mapGroup(data as GroupRow, counts.get(groupId) ?? 1);
      },
      async deleteGroup(groupId) {
        const { error } = await supabase.from('loopedin_groups').delete().eq('id', groupId);
        throwIfError(error);
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
        const { data, error } = await supabase
          .from('loopedin_events')
          .insert(eventInsert(payload, userId))
          .select('id, group_id, created_by, title, starts_at, ends_at, location, description, status_label, visibility, timeline, cover_url')
          .single();
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
        if (media?.length) throw new Error('Remove this event’s photos before canceling the plan.');
        const { data, error } = await supabase.from('loopedin_events').delete().eq('id', eventId).select('id');
        throwIfError(error);
        if (!data?.some((row) => row.id === eventId)) throw new Error('The plan was not deleted. Check your access and try again.');
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
        if (!userData.user) throw new Error('You must be signed in.');
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
        if (personId !== userId) throw new Error('You can only change your own RSVP.');
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
        if (personId !== userId) throw new Error('You can only remove your own RSVP.');
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
      async sendMessage(eventId, body) {
        const trimmedBody = body.trim();
        if (!trimmedBody) throw new Error('Write a message before sending.');
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('loopedin_event_messages')
          .insert({ event_id: eventId, author_id: userId, body: trimmedBody })
          .select('id, event_id, author_id, body, created_at')
          .single();
        throwIfError(error);

        const profiles = await getProfiles([userId]);
        return mapMessage(data as MessageRow, profiles.get(userId), true);
      },
    },
    media: {
      async uploadMedia(payload: MediaUploadPayload) {
        validateMediaUpload(payload);
        if ((payload.caption?.trim() && payload.caption.trim() !== payload.altText.trim()) || payload.sourceUrl || payload.creatorName || payload.sourceName || payload.creatorUrl) {
          throw new Error('This Supabase project needs the media metadata migration before it can preserve captions, alt text, and attribution separately.');
        }
        const userId = await getCurrentUserId();
        const response = await fetch(payload.fileUri);
        const blob = await response.blob();
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = `${payload.eventId}/${userId}-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage.from(mediaBucket).upload(storagePath, blob);
        throwIfError(uploadError);

        const { data, error } = await supabase
          .from('loopedin_event_media')
          .insert({
            event_id: payload.eventId,
            storage_path: storagePath,
            caption: payload.altText.trim(),
            uploaded_by: userId,
          })
          .select('id, event_id, storage_path, caption, uploaded_by, uploaded_at')
          .single();
        throwIfError(error);
        return mapMedia(data as MediaRow);
      },
      async listMedia(eventId) {
        const { data, error } = await supabase
          .from('loopedin_event_media')
          .select('id, event_id, storage_path, caption, uploaded_by, uploaded_at')
          .eq('event_id', eventId)
          .order('uploaded_at', { ascending: false });
        throwIfError(error);
        return Promise.all(((data ?? []) as MediaRow[]).map(mapMedia));
      },
      async deleteMedia(mediaId) {
        const { data, error } = await supabase
          .from('loopedin_event_media')
          .select('storage_path')
          .eq('id', mediaId)
          .single();
        throwIfError(error);

        const { error: deleteError } = await supabase.from('loopedin_event_media').delete().eq('id', mediaId);
        throwIfError(deleteError);

        if (data?.storage_path) {
          const { error: storageError } = await supabase.storage.from(mediaBucket).remove([data.storage_path]);
          throwIfError(storageError);
        }
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
  };
}
