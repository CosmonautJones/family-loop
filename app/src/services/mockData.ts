import type { Event, EventActivity, EventMessage, Group, MediaItem, MemoryItem, RSVP } from '../types/domain';
import type { NotificationItem } from './api';
import { eventDetail, eventRsvps, eventThread } from '../features/events/fixtures';
import { heroEvent, homeActivity, homeMemories } from '../features/home/fixtures';
import { memoriesRecap } from '../features/memories/fixtures';
import { groupsOverview } from '../features/groups/fixtures';

export type MockDatabase = {
  groups: Group[];
  events: Event[];
  rsvps: RSVP[];
  activity: EventActivity[];
  messages: EventMessage[];
  memories: MemoryItem[];
  media: MediaItem[];
  notifications: NotificationItem[];
};

export function createMockDatabase(): MockDatabase {
  const media = [heroEvent, eventDetail]
    .filter((event) => event.coverUri)
    .map((event, index) => ({
      id: `media-${event.id}`,
      eventId: event.id,
      uri: event.coverUri ?? '',
      caption: index === 0 ? 'Golden hour before the picnic' : 'Birthday brunch table details',
      uploadedBy: 'person-maya',
      uploadedAt: '2026-07-04T20:00:00-05:00',
    } satisfies MediaItem));

  return {
    groups: [...groupsOverview.groups],
    events: [heroEvent, eventDetail],
    rsvps: [...eventRsvps],
    activity: [...homeActivity],
    messages: [...eventThread],
    memories: [...homeMemories, memoriesRecap],
    media,
    notifications: [
      {
        id: 'notification-brunch-update',
        kind: 'event_update',
        title: 'Brunch parking note added',
        body: 'Mia added the best entrance for grandparents.',
        eventId: eventDetail.id,
        groupId: eventDetail.groupId,
        read: false,
        createdAt: '2026-07-17T18:20:00-05:00',
      },
    ],
  };
}

export function createEmptyMockDatabase(): MockDatabase {
  return {
    groups: [],
    events: [],
    rsvps: [],
    activity: [],
    messages: [],
    memories: [],
    media: [],
    notifications: [],
  };
}

export function cloneDatabase(database: MockDatabase): MockDatabase {
  return JSON.parse(JSON.stringify(database));
}
