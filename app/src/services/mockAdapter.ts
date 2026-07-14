import type { CreateEventPayload, CreateGroupPayload, CreateRsvpPayload, LoopedInService, MediaUploadPayload, UpdateEventPayload } from './api';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';
import { validateMediaUpload } from './mediaValidation';
import { createMemoryActorSessionStore, type LocalActorSessionStore } from './localActorSession';
import { updateEventLocationTimeline } from '../features/events/createEvent';

const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120));

export type MockServiceOptions = {
  onChange?: (database: MockDatabase) => Promise<void>;
  actorSession?: LocalActorSessionStore;
};

export function createMockLoopedInService(seed: MockDatabase = createMockDatabase(), options: MockServiceOptions = {}): LoopedInService {
  const db = cloneDatabase(seed);
  const nextId = (prefix: string, ids: string[]) => Math.max(0, ...ids.map((id) => id.startsWith(prefix) ? Number(id.slice(prefix.length)) || 0 : 0)) + 1;
  let nextGroupId = nextId('group-created-', db.groups.map((item) => item.id));
  let nextEventId = nextId('event-created-', db.events.map((item) => item.id));
  let nextMessageId = nextId('message-created-', db.messages.map((item) => item.id));
  let nextMediaId = nextId('media-created-', db.media.map((item) => item.id));
  const actorSession = options.actorSession ?? createMemoryActorSessionStore();
  const authListeners = new Set<(session: Awaited<ReturnType<typeof currentSession>>) => void>();
  const allProfiles = () => [...new Map(db.groups.flatMap((group) => group.members ?? []).map((member) => [member.id, member])).values()];
  const actor = () => {
    const actorId = actorSession.getActorId();
    if (!actorId) throw new Error('Choose a family profile to continue.');
    const profile = allProfiles().find((member) => member.id === actorId);
    if (!profile) throw new Error('This local profile is no longer available.');
    return profile;
  };
  const currentSession = async () => {
    const actorId = actorSession.getActorId();
    const profile = actorId ? allProfiles().find((member) => member.id === actorId) : undefined;
    return profile ? { userId: profile.id, displayName: profile.name, token: 'local-profile-session', expiresAt: '9999-12-31T23:59:59Z' } : null;
  };
  const groupMembership = (groupId: string) => {
    const profile = actor();
    const group = db.groups.find((item) => item.id === groupId);
    if (!group) throw new Error(`You do not have access to group ${groupId}.`);
    const member = group.members?.find((item) => item.id === profile.id) ?? null;
    if (!member) throw new Error(`You do not have access to group ${groupId}.`);
    return { group, member, profile };
  };
  const eventMembership = (eventId: string) => {
    const event = db.events.find((item) => item.id === eventId);
    if (!event) return { event: null, group: null, member: null, profile: actor() };
    return { event, ...groupMembership(event.groupId) };
  };
  const requireEventMembership = (eventId: string) => {
    const access = eventMembership(eventId);
    if (!access.event || !access.group || !access.member) throw new Error(`Missing event ${eventId}`);
    return { ...access, event: access.event, group: access.group, member: access.member };
  };
  const changed = async <T>(value: T) => {
    await options.onChange?.(cloneDatabase(db));
    return wait(value);
  };

  return {
    auth: {
      login: async () => {
        const profile = allProfiles()[0];
        if (!profile) throw new Error('No local profiles are available.');
        actorSession.setActorId(profile.id);
        const session = await currentSession();
        authListeners.forEach((listener) => listener(session));
        return session!;
      },
      signUp: async () => {
        throw new Error('Account creation is unavailable in the local family demo.');
      },
      requestPasswordReset: async () => {
        throw new Error('Password recovery is unavailable in the local family demo.');
      },
      updatePassword: async () => {
        throw new Error('Password recovery is unavailable in the local family demo.');
      },
      logout: async () => {
        actorSession.setActorId(null);
        authListeners.forEach((listener) => listener(null));
        return wait(undefined);
      },
      getSession: () => currentSession().then(wait),
      onAuthStateChange: (listener) => {
        authListeners.add(listener);
        return () => authListeners.delete(listener);
      },
      refreshSession: async () => {
        const session = await currentSession();
        if (!session) throw new Error('Choose a family profile to continue.');
        return wait(session);
      },
      listLocalProfiles: () => wait(allProfiles()),
      chooseLocalProfile: async (personId) => {
        if (!allProfiles().some((profile) => profile.id === personId)) throw new Error('That local profile is unavailable.');
        actorSession.setActorId(personId);
        const session = await currentSession();
        authListeners.forEach((listener) => listener(session));
        return wait(session!);
      },
    },
    groups: {
      listGroups: async () => {
        const profile = actor();
        return wait(db.groups.filter((group) => group.members?.some((member) => member.id === profile.id)));
      },
      listGroupMembers: async (groupId) => {
        const { group } = groupMembership(groupId);
        return wait([...(group?.members ?? [])]);
      },
      getGroup: async (groupId) => wait(groupMembership(groupId).group),
      createGroup: async (payload: CreateGroupPayload) => {
        const profile = actor();
        const existing = db.groups.find((group) => 'creationKey' in group && group.creationKey === payload.creationKey);
        if (existing) return wait(existing);
        const group = { id: `group-created-${nextGroupId++}`, badge: 'New', tone: 'coral' as const, memberCount: 1, members: [{ ...profile, role: 'owner' as const }], ...payload };
        db.groups.push(group);
        return changed(group);
      },
      canCreateGroup: async () => false,
      validateInvitation: async () => ({ status: 'unavailable' as const }),
      acceptInvitation: async () => { throw new Error('Invitations are unavailable in the local family demo.'); },
      declineInvitation: async () => { throw new Error('Invitations are unavailable in the local family demo.'); },
      createInvitation: async () => { throw new Error('Invitations are unavailable in the local family demo.'); },
      listInvitations: async () => [],
      revokeInvitation: async () => { throw new Error('Invitations are unavailable in the local family demo.'); },
      removeMember: async () => { throw new Error('Membership management is unavailable in the local family demo.'); },
      leaveGroup: async () => { throw new Error('Membership management is unavailable in the local family demo.'); },
      transferOwnership: async () => { throw new Error('Membership management is unavailable in the local family demo.'); },
      updateGroup: async (groupId, patch) => {
        const { group, member } = groupMembership(groupId);
        if (member?.role !== 'owner' && member?.role !== 'admin') throw new Error('Only a family owner or admin can update this group.');
        if (!group) throw new Error(`Missing group ${groupId}`);
        Object.assign(group, patch);
        return changed(group);
      },
      deleteGroup: async (groupId) => {
        const { member } = groupMembership(groupId);
        if (member?.role !== 'owner') throw new Error('Only the family owner can delete this group.');
        db.groups = db.groups.filter((group) => group.id !== groupId);
        return changed(undefined);
      },
    },
    events: {
      listEvents: async (groupId) => {
        const profile = actor();
        if (groupId) groupMembership(groupId);
        const allowedGroups = new Set(db.groups.filter((group) => group.members?.some((member) => member.id === profile.id)).map((group) => group.id));
        return wait(db.events
        .filter((event) => allowedGroups.has(event.groupId) && (!groupId || event.groupId === groupId))
        .sort((left, right) => {
          const leftTime = Date.parse(left.startsAt);
          const rightTime = Date.parse(right.startsAt);
          const leftInvalid = Number.isNaN(leftTime);
          const rightInvalid = Number.isNaN(rightTime);
          const timeOrder = leftInvalid !== rightInvalid
            ? Number(leftInvalid) - Number(rightInvalid)
            : leftInvalid
              ? left.startsAt.localeCompare(right.startsAt)
              : leftTime - rightTime;
          return timeOrder || left.id.localeCompare(right.id);
        }));
      },
      getEvent: async (eventId) => wait(eventMembership(eventId).event),
      createEvent: async (payload: CreateEventPayload) => {
        const { profile } = groupMembership(payload.groupId);
        const event = {
          id: `event-created-${nextEventId++}`,
          statusLabel: 'Draft',
          visibility: 'group' as const,
          timeline: [
            { title: 'Logistics', detail: `${payload.location} · details are ready to share.` },
            { title: 'Conversation', detail: 'Chat, reminders, and media will attach to this event.' },
          ],
          creatorId: profile.id,
          ...payload,
        };
        db.events.unshift(event);
        return changed(event);
      },
      updateEvent: async (eventId, patch: UpdateEventPayload) => {
        const { event, member, profile } = requireEventMembership(eventId);
        if (!event) throw new Error(`Missing event ${eventId}`);
        if (event.creatorId !== profile.id && member.role !== 'owner' && member.role !== 'admin') throw new Error('Only the event creator or a family owner can update this event.');
        Object.assign(event, patch);
        if (patch.location) event.timeline = updateEventLocationTimeline(event.timeline, patch.location);
        return changed(event);
      },
      deleteEvent: async (eventId) => {
        const { event, member, profile } = requireEventMembership(eventId);
        if (event.creatorId !== profile.id && member.role !== 'owner' && member.role !== 'admin') throw new Error('Only the event creator or a family owner can delete this event.');
        db.events = db.events.filter((event) => event.id !== eventId);
        db.rsvps = db.rsvps.filter((rsvp) => rsvp.eventId !== eventId);
        db.messages = db.messages.filter((message) => message.eventId !== eventId);
        db.media = db.media.filter((media) => media.eventId !== eventId);
        db.activity = db.activity.filter((activity) => activity.eventId !== eventId);
        db.memories = db.memories.filter((memory) => memory.eventId !== eventId);
        db.notifications = db.notifications.filter((notification) => notification.eventId !== eventId);
        db.reminders = db.reminders.filter((reminder) => reminder.eventId !== eventId);
        return changed(undefined);
      },
    },
    rsvps: {
      listRsvps: async (eventId) => {
        requireEventMembership(eventId);
        return wait(db.rsvps.filter((rsvp) => rsvp.eventId === eventId));
      },
      upsertRsvp: async (payload: CreateRsvpPayload) => {
        const { profile } = requireEventMembership(payload.eventId);
        const next = { eventId: payload.eventId, personId: profile.id, personName: profile.name, status: payload.status, note: payload.note };
        const existing = db.rsvps.find((rsvp) => rsvp.eventId === payload.eventId && rsvp.personId === profile.id);
        if (existing) Object.assign(existing, next);
        else db.rsvps.push(next);
        return changed(existing ?? next);
      },
      updateRsvp: async (eventId, personId, patch) => {
        const { profile } = requireEventMembership(eventId);
        if (personId !== profile.id) throw new Error('You can only change your own RSVP.');
        const rsvp = db.rsvps.find((item) => item.eventId === eventId && item.personId === personId);
        if (!rsvp) throw new Error(`Missing RSVP for ${personId}`);
        Object.assign(rsvp, patch);
        return changed(rsvp);
      },
      deleteRsvp: async (eventId, personId) => {
        const { profile } = requireEventMembership(eventId);
        if (personId !== profile.id) throw new Error('You can only remove your own RSVP.');
        db.rsvps = db.rsvps.filter((rsvp) => rsvp.eventId !== eventId || rsvp.personId !== personId);
        return changed(undefined);
      },
    },
    activity: {
      listRecentActivity: async () => {
        const profile = actor();
        const allowedGroups = new Set(db.groups.filter((group) => group.members?.some((member) => member.id === profile.id)).map((group) => group.id));
        const allowedEvents = new Set(db.events.filter((event) => allowedGroups.has(event.groupId)).map((event) => event.id));
        return wait(db.activity.filter((item) => allowedEvents.has(item.eventId)));
      },
    },
    thread: {
      subscribeMessages: () => () => undefined,
      listMessages: async (eventId) => {
        const { profile } = requireEventMembership(eventId);
        return wait(db.messages
        .filter((message) => message.eventId === eventId)
        .sort((left, right) => {
          const timeOrder = Date.parse(left.createdAt) - Date.parse(right.createdAt);
          return timeOrder || left.id.localeCompare(right.id);
        }).map((message) => ({ ...message, self: message.authorId === profile.id })));
      },
      sendMessage: async (eventId, body) => {
        const trimmedBody = body.trim();
        if (!trimmedBody) return Promise.reject(new Error('Write a message before sending.'));
        const { profile } = requireEventMembership(eventId);
        const message = { id: `message-created-${nextMessageId++}`, eventId, body: trimmedBody, authorId: profile.id, authorName: profile.name, author: profile, self: true, createdAt: new Date().toISOString() };
        db.messages.push(message);
        return changed(message);
      },
    },
    media: {
      uploadMedia: async (payload: MediaUploadPayload) => {
        validateMediaUpload(payload);
        const { profile } = requireEventMembership(payload.eventId);
        const item = { id: `media-created-${nextMediaId++}`, eventId: payload.eventId, uri: payload.fileUri, caption: payload.caption?.trim() || 'New shared moment', altText: payload.altText.trim(), uploadedBy: profile.id, uploadedAt: new Date().toISOString(), sourceName: payload.sourceName?.trim() || undefined, sourceUrl: payload.sourceUrl?.trim() || undefined, creatorName: payload.creatorName?.trim() || undefined, creatorUrl: payload.creatorUrl?.trim() || undefined };
        db.media.push(item);
        return changed(item);
      },
      listMedia: async (eventId) => {
        requireEventMembership(eventId);
        return wait(db.media.filter((item) => item.eventId === eventId));
      },
      deleteMedia: async (mediaId) => {
        const item = db.media.find((candidate) => candidate.id === mediaId);
        if (!item) return Promise.reject(new Error(`Missing media ${mediaId}`));
        const { member, profile } = requireEventMembership(item.eventId);
        if (item.uploadedBy !== profile.id && member?.role !== 'owner' && member?.role !== 'admin') return Promise.reject(new Error('Only the person who shared this photo or a family owner can remove it.'));
        db.media = db.media.filter((item) => item.id !== mediaId);
        return changed(undefined);
      },
    },
    notifications: {
      listNotifications: async () => {
        const profile = actor();
        const allowedGroups = new Set(db.groups.filter((group) => group.members?.some((member) => member.id === profile.id)).map((group) => group.id));
        return wait(db.notifications.filter((notification) => {
          const groupId = notification.groupId ?? db.events.find((event) => event.id === notification.eventId)?.groupId;
          return notification.userId === profile.id && Boolean(groupId && allowedGroups.has(groupId));
        }));
      },
      markRead: async (notificationId) => {
        const profile = actor();
        const notification = db.notifications.find((item) => item.id === notificationId);
        if (!notification) throw new Error(`Missing notification ${notificationId}`);
        if (notification.userId !== profile.id) throw new Error('You can only update notifications addressed to you.');
        const groupId = notification.groupId ?? db.events.find((event) => event.id === notification.eventId)?.groupId;
        if (!groupId) throw new Error('This notification is not attached to an accessible group.');
        groupMembership(groupId);
        notification.read = true;
        return changed(undefined);
      },
      clearAll: async () => {
        const profile = actor();
        const allowedGroups = new Set(db.groups.filter((group) => group.members?.some((member) => member.id === profile.id)).map((group) => group.id));
        db.notifications = db.notifications.map((notification) => {
          const groupId = notification.groupId ?? db.events.find((event) => event.id === notification.eventId)?.groupId;
          return notification.userId === profile.id && groupId && allowedGroups.has(groupId) ? { ...notification, read: true } : notification;
        });
        return changed(undefined);
      },
    },
    reminders: {
      getPreference: async (eventId) => {
        const { profile } = requireEventMembership(eventId);
        return wait(db.reminders.find((item) => item.eventId === eventId && item.userId === profile.id) ?? null);
      },
      enablePreference: async (eventId) => {
        const { profile } = requireEventMembership(eventId);
        const next = { eventId, userId: profile.id, timing: 'morning_of_event' as const, enabled: true as const, updatedAt: new Date().toISOString() };
        const existing = db.reminders.find((item) => item.eventId === eventId && item.userId === profile.id);
        if (existing) Object.assign(existing, next);
        else db.reminders.push(next);
        return changed(existing ?? next);
      },
      disablePreference: async (eventId) => {
        const { profile } = requireEventMembership(eventId);
        db.reminders = db.reminders.filter((item) => item.eventId !== eventId || item.userId !== profile.id);
        return changed(undefined);
      },
    },
  };
}

export const loopedInService = createMockLoopedInService();
