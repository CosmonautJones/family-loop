import type { CreateEventPayload, CreateGroupPayload, CreateRsvpPayload, LoopedInService, MediaUploadPayload, UpdateEventPayload } from './api';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';
import { validateMediaUpload } from './mediaValidation';

const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120));

export type MockServiceOptions = {
  onChange?: (database: MockDatabase) => Promise<void>;
};

export function createMockLoopedInService(seed: MockDatabase = createMockDatabase(), options: MockServiceOptions = {}): LoopedInService {
  const db = cloneDatabase(seed);
  const nextId = (prefix: string, ids: string[]) => Math.max(0, ...ids.map((id) => id.startsWith(prefix) ? Number(id.slice(prefix.length)) || 0 : 0)) + 1;
  let nextGroupId = nextId('group-created-', db.groups.map((item) => item.id));
  let nextEventId = nextId('event-created-', db.events.map((item) => item.id));
  let nextMessageId = nextId('message-created-', db.messages.map((item) => item.id));
  let nextMediaId = nextId('media-created-', db.media.map((item) => item.id));
  const mockSession = {
    userId: 'person-you',
    displayName: 'Alex Jones',
    token: 'mock-loopedin-token',
    expiresAt: '2026-12-31T23:59:59Z',
  };
  const changed = async <T>(value: T) => {
    await options.onChange?.(cloneDatabase(db));
    return wait(value);
  };

  return {
    auth: {
      login: (email) => wait({
        ...mockSession,
        displayName: email.split('@')[0] || 'You',
      }),
      logout: () => wait(undefined),
      getSession: () => wait(mockSession),
      onAuthStateChange: () => () => undefined,
      refreshSession: () => wait({
        ...mockSession,
        token: 'mock-loopedin-token-refreshed',
      }),
    },
    groups: {
      listGroups: () => wait([...db.groups]),
      listGroupMembers: (groupId) => wait([...(db.groups.find((group) => group.id === groupId)?.members ?? [])]),
      getGroup: (groupId) => wait(db.groups.find((group) => group.id === groupId) ?? null),
      createGroup: (payload: CreateGroupPayload) => {
        const group = { id: `group-created-${nextGroupId++}`, badge: 'New', tone: 'coral' as const, memberCount: 1, ...payload };
        db.groups.push(group);
        return changed(group);
      },
      updateGroup: (groupId, patch) => {
        const group = db.groups.find((item) => item.id === groupId);
        if (!group) throw new Error(`Missing group ${groupId}`);
        Object.assign(group, patch);
        return changed(group);
      },
      deleteGroup: (groupId) => {
        db.groups = db.groups.filter((group) => group.id !== groupId);
        return changed(undefined);
      },
    },
    events: {
      listEvents: (groupId) => wait(db.events
        .filter((event) => !groupId || event.groupId === groupId)
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
        })),
      getEvent: (eventId) => wait(db.events.find((event) => event.id === eventId) ?? null),
      createEvent: (payload: CreateEventPayload) => {
        const event = {
          id: `event-created-${nextEventId++}`,
          statusLabel: 'Draft',
          visibility: 'group' as const,
          timeline: [
            { title: 'Logistics', detail: `${payload.location} · details are ready to share.` },
            { title: 'Conversation', detail: 'Chat, reminders, and media will attach to this event.' },
          ],
          ...payload,
        };
        db.events.unshift(event);
        return changed(event);
      },
      updateEvent: (eventId, patch: UpdateEventPayload) => {
        const event = db.events.find((item) => item.id === eventId);
        if (!event) throw new Error(`Missing event ${eventId}`);
        Object.assign(event, patch);
        return changed(event);
      },
      deleteEvent: (eventId) => {
        db.events = db.events.filter((event) => event.id !== eventId);
        return changed(undefined);
      },
    },
    rsvps: {
      listRsvps: (eventId) => wait(db.rsvps.filter((rsvp) => rsvp.eventId === eventId)),
      upsertRsvp: (payload: CreateRsvpPayload) => {
        const existing = db.rsvps.find((rsvp) => rsvp.eventId === payload.eventId && rsvp.personId === payload.personId);
        if (existing) Object.assign(existing, payload);
        else db.rsvps.push(payload);
        return changed(existing ?? payload);
      },
      updateRsvp: (eventId, personId, patch) => {
        const rsvp = db.rsvps.find((item) => item.eventId === eventId && item.personId === personId);
        if (!rsvp) throw new Error(`Missing RSVP for ${personId}`);
        Object.assign(rsvp, patch);
        return changed(rsvp);
      },
      deleteRsvp: (eventId, personId) => {
        db.rsvps = db.rsvps.filter((rsvp) => rsvp.eventId !== eventId || rsvp.personId !== personId);
        return changed(undefined);
      },
    },
    activity: {
      listRecentActivity: () => wait([...db.activity]),
    },
    thread: {
      listMessages: (eventId) => wait(db.messages
        .filter((message) => message.eventId === eventId)
        .sort((left, right) => {
          const timeOrder = Date.parse(left.createdAt) - Date.parse(right.createdAt);
          return timeOrder || left.id.localeCompare(right.id);
        })),
      sendMessage: (eventId, body) => {
        const trimmedBody = body.trim();
        if (!trimmedBody) return Promise.reject(new Error('Write a message before sending.'));
        const message = { id: `message-created-${nextMessageId++}`, eventId, body: trimmedBody, authorName: mockSession.displayName, self: true, createdAt: new Date().toISOString() };
        db.messages.push(message);
        return changed(message);
      },
    },
    media: {
      uploadMedia: async (payload: MediaUploadPayload) => {
        validateMediaUpload(payload);
        if (!db.events.some((event) => event.id === payload.eventId)) return Promise.reject(new Error(`Missing event ${payload.eventId}`));
        const item = { id: `media-created-${nextMediaId++}`, eventId: payload.eventId, uri: payload.fileUri, caption: payload.caption?.trim() || 'New shared moment', altText: payload.altText.trim(), uploadedBy: 'person-you', uploadedAt: new Date().toISOString(), sourceName: payload.sourceName?.trim() || undefined, sourceUrl: payload.sourceUrl?.trim() || undefined, creatorName: payload.creatorName?.trim() || undefined, creatorUrl: payload.creatorUrl?.trim() || undefined };
        db.media.push(item);
        return changed(item);
      },
      listMedia: (eventId) => wait(db.media.filter((item) => item.eventId === eventId)),
      deleteMedia: (mediaId) => {
        if (!db.media.some((item) => item.id === mediaId)) return Promise.reject(new Error(`Missing media ${mediaId}`));
        db.media = db.media.filter((item) => item.id !== mediaId);
        return changed(undefined);
      },
    },
    notifications: {
      listNotifications: () => wait([...db.notifications]),
      markRead: (notificationId) => {
        const notification = db.notifications.find((item) => item.id === notificationId);
        if (notification) notification.read = true;
        return changed(undefined);
      },
      clearAll: () => {
        db.notifications = [];
        return changed(undefined);
      },
    },
  };
}

export const loopedInService = createMockLoopedInService();
