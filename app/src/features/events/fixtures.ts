import type { Event, EventMessage, RSVP } from '../../types/domain';

export const eventDetail: Event = {
  id: 'event-birthday-brunch',
  groupId: 'group-jones-family',
  title: 'Emma’s Birthday Brunch',
  startsAt: '2026-07-18T11:00:00-05:00',
  endsAt: '2026-07-18T13:00:00-05:00',
  location: 'Botanical Garden Cafe',
  description: 'The event page is where the plan, guest context, and post-brunch memories stay together.',
  statusLabel: 'Host',
  visibility: 'group',
  timeline: [
    { title: 'Logistics', detail: 'Botanical Garden Cafe · 11:00 AM · Bring wrapped gifts' },
    { title: 'Conversation', detail: 'Parking notes, allergy reminders, and gift coordination live here' },
    { title: 'Afterward', detail: 'Photos and recap stay attached to the event automatically' },
  ],
};

export const eventRsvps: RSVP[] = [
  { eventId: 'event-birthday-brunch', personId: 'person-emma', personName: 'Emma', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-mia', personName: 'Mia', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-noah', personName: 'Noah', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-ava', personName: 'Ava', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-jack', personName: 'Jack', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-lucas', personName: 'Lucas', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-ella', personName: 'Ella', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-ben', personName: 'Ben', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-zoe', personName: 'Zoe', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-owen', personName: 'Owen', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-grace', personName: 'Grace', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-levi', personName: 'Levi', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-chloe', personName: 'Chloe', status: 'going' },
  { eventId: 'event-birthday-brunch', personId: 'person-lily', personName: 'Lily', status: 'going' },
];

export const eventThread: EventMessage[] = [
  {
    id: 'message-water',
    eventId: 'event-birthday-brunch',
    body: 'Can someone grab sparkling water and extra napkins?',
    authorName: 'Mia',
    self: false,
    createdAt: '2026-07-17T18:10:00-05:00',
  },
  {
    id: 'message-bring-both',
    eventId: 'event-birthday-brunch',
    body: 'Yep — I’ll bring both and get there a little early.',
    authorName: 'You',
    self: true,
    createdAt: '2026-07-17T18:11:00-05:00',
  },
  {
    id: 'message-parking-note',
    eventId: 'event-birthday-brunch',
    body: 'Perfect. I also added the parking note for grandparents.',
    authorName: 'Mia',
    self: false,
    createdAt: '2026-07-17T18:14:00-05:00',
  },
];
