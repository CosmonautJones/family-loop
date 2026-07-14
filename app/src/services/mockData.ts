import type { Event, EventActivity, EventMessage, Group, GroupMember, MediaItem, MemoryItem, RSVP } from '../types/domain';
import type { NotificationItem } from './api';

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

const members: GroupMember[] = [
  { id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', role: 'owner' },
  { id: 'person-maya', name: 'Maya Jones', initials: 'MJ', avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', role: 'member' },
  { id: 'person-emma', name: 'Emma Jones', initials: 'EJ', avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', role: 'member' },
  { id: 'person-noah', name: 'Noah Jones', initials: 'NJ', avatarUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', role: 'member' },
  { id: 'person-ruth', name: 'Grandma Ruth', initials: 'GR', avatarUri: '', role: 'member' },
];

const trip = (event: Partial<Event> & Pick<Event, 'id' | 'title' | 'startsAt' | 'endsAt' | 'location' | 'description' | 'coverUri'>): Event => ({
  groupId: 'group-jones-family',
  statusLabel: 'Trip',
  visibility: 'group',
  timeline: [
    { title: 'Plan', detail: `${event.location} · details shared with the Jones Family` },
    { title: 'Conversation', detail: 'Questions, updates, and photos stay with this trip.' },
  ],
  ...event,
});

const events: Event[] = [
  trip({ id: 'event-door-county', title: 'Door County Weekend', startsAt: '2026-07-24T09:00:00-05:00', endsAt: '2026-07-26T18:00:00-05:00', location: 'Fish Creek, Wisconsin', description: 'Cabin weekend with an easy fish boil dinner and time by the water.', coverUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80' }),
  trip({ id: 'event-yellowstone', title: 'Yellowstone Family Road Trip', startsAt: '2026-08-16T08:00:00-05:00', endsAt: '2026-08-23T20:00:00-06:00', location: 'Yellowstone National Park', description: 'A relaxed week of geysers, wildlife stops, and accessible boardwalks.', coverUri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80' }),
  trip({ id: 'event-charleston', title: 'Charleston Holiday Visit', startsAt: '2026-12-20T07:30:00-06:00', endsAt: '2026-12-27T19:00:00-05:00', location: 'Charleston, South Carolina', description: 'Christmas together with one shared itinerary and plenty of downtime.', coverUri: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&w=1200&q=80' }),
  trip({ id: 'event-lake-geneva', title: 'Lake Geneva Reunion', startsAt: '2026-06-12T10:00:00-05:00', endsAt: '2026-06-14T17:00:00-05:00', location: 'Lake Geneva, Wisconsin', description: 'Our completed summer reunion, saved with the photos and conversation.', statusLabel: 'Memory', coverUri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80' }),
];

const rsvps: RSVP[] = events.flatMap((event) => members.map((person, index) => ({
  eventId: event.id,
  personId: person.id,
  personName: person.name,
  status: index === 4 && event.id === 'event-yellowstone' ? 'maybe' as const : 'going' as const,
  note: index === 4 && event.id === 'event-yellowstone' ? 'Checking the walking distances.' : undefined,
})));

const messages: EventMessage[] = [
  { id: 'message-door-1', eventId: 'event-door-county', body: 'I reserved the cabin. The first-floor room is for Grandma Ruth.', authorId: 'person-maya', authorName: 'Maya Jones', author: members[1], self: false, createdAt: '2026-07-10T18:10:00-05:00' },
  { id: 'message-door-2', eventId: 'event-door-county', body: 'Great. I’ll bring cards and pick up breakfast on the way.', authorId: 'person-you', authorName: 'Alex Jones', author: members[0], self: true, createdAt: '2026-07-10T18:14:00-05:00' },
  { id: 'message-yellowstone-1', eventId: 'event-yellowstone', body: 'Can we keep Tuesday light after the long drive?', authorId: 'person-ruth', authorName: 'Grandma Ruth', author: members[4], self: false, createdAt: '2026-07-11T09:30:00-05:00' },
  { id: 'message-yellowstone-2', eventId: 'event-yellowstone', body: 'Absolutely — just Old Faithful and an early dinner.', authorId: 'person-emma', authorName: 'Emma Jones', author: members[2], self: false, createdAt: '2026-07-11T09:42:00-05:00' },
  { id: 'message-lake-1', eventId: 'event-lake-geneva', body: 'These dock photos turned out beautifully!', authorId: 'person-ruth', authorName: 'Grandma Ruth', author: members[4], self: false, createdAt: '2026-06-15T10:00:00-05:00' },
];

const media: MediaItem[] = [
  { id: 'media-lake-dock', eventId: 'event-lake-geneva', uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', caption: 'Everyone together by the lake', altText: 'Family gathered beside a calm lake and mountains', uploadedBy: 'person-maya', uploadedAt: '2026-06-14T15:20:00-05:00', sourceName: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=loopedin&utm_medium=referral', creatorName: 'Luca Bravo', creatorUrl: 'https://unsplash.com/@lucabravo?utm_source=loopedin&utm_medium=referral' },
  { id: 'media-lake-breakfast', eventId: 'event-lake-geneva', uri: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80', caption: 'Sunday breakfast before the drive home', altText: 'Family and friends sharing breakfast around a table', uploadedBy: 'person-emma', uploadedAt: '2026-06-14T10:30:00-05:00', sourceName: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=loopedin&utm_medium=referral', creatorName: 'Helena Lopes', creatorUrl: 'https://unsplash.com/@wildlittlethingsphoto?utm_source=loopedin&utm_medium=referral' },
  { id: 'media-lake-sunset', eventId: 'event-lake-geneva', uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', caption: 'Sunset from the porch', altText: 'Warm sunset light over a quiet outdoor landscape', uploadedBy: 'person-noah', uploadedAt: '2026-06-13T20:15:00-05:00', sourceName: 'Unsplash', sourceUrl: 'https://unsplash.com/?utm_source=loopedin&utm_medium=referral', creatorName: 'Nathan Dumlao', creatorUrl: 'https://unsplash.com/@nate_dumlao?utm_source=loopedin&utm_medium=referral' },
];

export function createMockDatabase(): MockDatabase {
  const group: Group = { id: 'group-jones-family', name: 'Jones Family', description: 'Trips, plans, conversations, and photos for our family.', kind: 'family', badge: 'Family', tone: 'sage', memberCount: members.length, members };
  return cloneDatabase({
    groups: [group],
    events,
    rsvps,
    messages,
    media,
    activity: [{ id: 'activity-lake-photos', eventId: 'event-lake-geneva', actor: members[1], title: 'Maya shared 3 reunion photos', detail: 'The Lake Geneva memory is ready', badge: 'Photos', tone: 'coral', createdAt: '2026-06-15T10:05:00-05:00' }],
    memories: [{ id: 'memory-lake-geneva', eventId: 'event-lake-geneva', title: 'Lake Geneva Reunion', description: 'A sunny family weekend by the water.', capturedOn: '2026-06-14T17:00:00-05:00', photoCount: 3, peopleCount: 5, commentCount: 1, tags: ['Lake', 'Reunion', 'Family'], resurfacedLabel: 'Last month', coverUri: media[0].uri, photoUris: media.map((item) => item.uri) }],
    notifications: [{ id: 'notification-door-county', kind: 'message', title: 'New Door County note', body: 'Maya reserved the cabin and saved the first-floor room.', eventId: 'event-door-county', groupId: 'group-jones-family', read: false, createdAt: '2026-07-10T18:10:00-05:00' }],
  });
}

export function createEmptyMockDatabase(): MockDatabase {
  return { groups: [], events: [], rsvps: [], activity: [], messages: [], memories: [], media: [], notifications: [] };
}

export function cloneDatabase(database: MockDatabase): MockDatabase {
  return JSON.parse(JSON.stringify(database));
}
