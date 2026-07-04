import type { Event, EventActivity, MemoryItem, Person } from '../../types/domain';

export const people: Person[] = [
  { id: 'person-emma', name: 'Emma', initials: 'E', avatarUri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { id: 'person-noah', name: 'Noah', initials: 'N', avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'person-maya', name: 'Maya', initials: 'M', avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
];

export const heroEvent: Event = {
  id: 'event-lake-picnic',
  groupId: 'group-jones-family',
  title: 'Lake Picnic with Family',
  startsAt: '2026-07-04T18:30:00-05:00',
  endsAt: '2026-07-04T20:30:00-05:00',
  location: 'North Shore Park',
  description: 'One event page for reminders, chat, and the shared album after sunset.',
  statusLabel: 'Next up',
  visibility: 'group',
  coverUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  timeline: [
    { title: 'Logistics', detail: 'Picnic blankets, grill slot, and grandparents pickup notes.' },
    { title: 'Conversation', detail: 'Keep updates, weather pivots, and snack swaps in one thread.' },
    { title: 'Afterward', detail: 'Photos and recap stay attached to the event automatically.' },
  ],
};

export const homeActivity: EventActivity[] = [
  {
    id: 'activity-zoo-recap',
    eventId: 'event-zoo-day',
    actor: people[0],
    title: 'Emma added 12 photos',
    detail: 'Zoo day recap is ready',
    badge: 'Recap',
    tone: 'coral',
    createdAt: '2026-07-03T20:00:00-05:00',
  },
  {
    id: 'activity-dinner-update',
    eventId: 'event-dinner-club',
    actor: people[1],
    title: 'Dinner moved to 7:30',
    detail: 'Everyone sees the update in context',
    badge: 'Updated',
    tone: 'sky',
    createdAt: '2026-07-03T17:15:00-05:00',
  },
];

export const homeMemories: MemoryItem[] = [
  {
    id: 'memory-fireworks',
    eventId: 'event-fireworks',
    title: 'Summer fireworks recap',
    description: 'The annual lakeside fireworks album with grandparent reactions and dock photos.',
    capturedOn: '2025-07-04T21:30:00-05:00',
    photoCount: 24,
    peopleCount: 6,
    commentCount: 3,
    tags: ['Fireworks', 'Dock', 'Family'],
    resurfacedLabel: 'On this day',
    coverUri: 'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?auto=format&fit=crop&w=900&q=80',
    photoUris: [
      'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    id: 'memory-dinner-club',
    eventId: 'event-dinner-club',
    title: 'Friday dinner club',
    description: 'A saved dinner plan ready to become the next recap.',
    capturedOn: '2026-07-11T19:00:00-05:00',
    photoCount: 0,
    peopleCount: 8,
    commentCount: 0,
    tags: ['Dinner', 'Friends'],
    resurfacedLabel: 'Coming soon',
    coverUri: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80',
    photoUris: ['https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80'],
  },
];

export const homeWeekSummary = '4 events · 2 reminders · 1 recap ready';
export const homeActivityTitle = 'The event stays at the center of the conversation.';
