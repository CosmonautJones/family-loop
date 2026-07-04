import type { CreateEventPayload, CreateGroupPayload, CreateRsvpPayload, LoopedInService, MediaUploadPayload, UpdateEventPayload } from './api';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';

const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120));

export function createMockLoopedInService(seed: MockDatabase = createMockDatabase()): LoopedInService {
  const db = cloneDatabase(seed);

  return {
    auth: {
      login: (email) => wait({
        userId: 'person-you',
        displayName: email.split('@')[0] || 'You',
        token: 'mock-loopedin-token',
        expiresAt: '2026-12-31T23:59:59Z',
      }),
      logout: () => wait(undefined),
      refreshSession: () => wait({
        userId: 'person-you',
        displayName: 'You',
        token: 'mock-loopedin-token-refreshed',
        expiresAt: '2026-12-31T23:59:59Z',
      }),
    },
    groups: {
      listGroups: () => wait([...db.groups]),
      getGroup: (groupId) => wait(db.groups.find((group) => group.id === groupId) ?? null),
      createGroup: (payload: CreateGroupPayload) => {
        const group = { id: `group-${Date.now()}`, badge: 'New', tone: 'coral' as const, memberCount: 1, ...payload };
        db.groups.push(group);
        return wait(group);
      },
      updateGroup: (groupId, patch) => {
        const group = db.groups.find((item) => item.id === groupId);
        if (!group) throw new Error(`Missing group ${groupId}`);
        Object.assign(group, patch);
        return wait(group);
      },
      deleteGroup: (groupId) => {
        db.groups = db.groups.filter((group) => group.id !== groupId);
        return wait(undefined);
      },
    },
    events: {
      listEvents: (groupId) => wait(db.events.filter((event) => !groupId || event.groupId === groupId)),
      getEvent: (eventId) => wait(db.events.find((event) => event.id === eventId) ?? null),
      createEvent: (payload: CreateEventPayload) => {
        const event = {
          id: `event-${Date.now()}`,
          statusLabel: 'Draft',
          visibility: 'group' as const,
          timeline: [
            { title: 'Logistics', detail: `${payload.location} · details are ready to share.` },
            { title: 'Conversation', detail: 'Chat, reminders, and media will attach to this event.' },
          ],
          ...payload,
        };
        db.events.unshift(event);
        return wait(event);
      },
      updateEvent: (eventId, patch: UpdateEventPayload) => {
        const event = db.events.find((item) => item.id === eventId);
        if (!event) throw new Error(`Missing event ${eventId}`);
        Object.assign(event, patch);
        return wait(event);
      },
      deleteEvent: (eventId) => {
        db.events = db.events.filter((event) => event.id !== eventId);
        return wait(undefined);
      },
    },
    rsvps: {
      listRsvps: (eventId) => wait(db.rsvps.filter((rsvp) => rsvp.eventId === eventId)),
      upsertRsvp: (payload: CreateRsvpPayload) => {
        const existing = db.rsvps.find((rsvp) => rsvp.eventId === payload.eventId && rsvp.personId === payload.personId);
        if (existing) Object.assign(existing, payload);
        else db.rsvps.push(payload);
        return wait(existing ?? payload);
      },
      updateRsvp: (eventId, personId, patch) => {
        const rsvp = db.rsvps.find((item) => item.eventId === eventId && item.personId === personId);
        if (!rsvp) throw new Error(`Missing RSVP for ${personId}`);
        Object.assign(rsvp, patch);
        return wait(rsvp);
      },
      deleteRsvp: (eventId, personId) => {
        db.rsvps = db.rsvps.filter((rsvp) => rsvp.eventId !== eventId || rsvp.personId !== personId);
        return wait(undefined);
      },
    },
    activity: {
      listRecentActivity: () => wait([...db.activity]),
    },
    thread: {
      listMessages: (eventId) => wait(db.messages.filter((message) => message.eventId === eventId)),
      sendMessage: (eventId, body) => {
        const message = { id: `message-${Date.now()}`, eventId, body, authorName: 'You', self: true, createdAt: new Date().toISOString() };
        db.messages.push(message);
        return wait(message);
      },
    },
    media: {
      uploadMedia: (payload: MediaUploadPayload) => {
        const item = { id: `media-${Date.now()}`, eventId: payload.eventId, uri: payload.fileUri, caption: payload.caption ?? 'New shared moment', uploadedBy: 'person-you', uploadedAt: new Date().toISOString() };
        db.media.push(item);
        return wait(item);
      },
      listMedia: (eventId) => wait(db.media.filter((item) => item.eventId === eventId)),
      deleteMedia: (mediaId) => {
        db.media = db.media.filter((item) => item.id !== mediaId);
        return wait(undefined);
      },
    },
    notifications: {
      listNotifications: () => wait([...db.notifications]),
      markRead: (notificationId) => {
        const notification = db.notifications.find((item) => item.id === notificationId);
        if (notification) notification.read = true;
        return wait(undefined);
      },
      clearAll: () => {
        db.notifications = [];
        return wait(undefined);
      },
    },
  };
}

export const loopedInService = createMockLoopedInService();
