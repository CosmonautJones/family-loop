import type { Event } from '../../types/domain';

export const calendarEvents = Array.from({ length: 28 }, (_, index) => ({
  day: index + 1,
  highlight: [5, 10, 12, 18, 25].includes(index + 1),
}));

export const calendarAgenda: { event: Event; badge: string; tone: 'sage' | 'sky' | 'coral' }[] = [
  {
    event: {
      id: 'event-lake-picnic',
      groupId: 'group-jones-family',
      creatorId: 'person-you',
      title: 'Today · Lake picnic',
      startsAt: '2026-07-04T18:30:00-05:00',
      endsAt: '2026-07-04T20:30:00-05:00',
      location: 'North Shore Park',
      description: 'Picnic, sunset photos, and reminders in one event thread.',
      statusLabel: 'Open',
      visibility: 'group',
      timeline: [],
    },
    badge: 'Open',
    tone: 'sage',
  },
  {
    event: {
      id: 'event-rooftop-movie',
      groupId: 'group-dinner-club',
      creatorId: 'person-maya',
      title: 'Jul 18 · Rooftop movie night',
      startsAt: '2026-07-18T20:00:00-05:00',
      endsAt: '2026-07-18T23:00:00-05:00',
      location: 'Maya\'s roof deck',
      description: 'Poll live and snack signup in the same event record.',
      statusLabel: 'Maybe',
      visibility: 'group',
      timeline: [],
    },
    badge: 'Maybe',
    tone: 'sky',
  },
  {
    event: {
      id: 'event-birthday-brunch',
      groupId: 'group-jones-family',
      creatorId: 'person-you',
      title: 'Jul 25 · Family birthday brunch',
      startsAt: '2026-07-25T11:00:00-05:00',
      endsAt: '2026-07-25T13:00:00-05:00',
      location: 'Botanical Garden Cafe',
      description: 'Gallery enabled and host notes stay on the event.',
      statusLabel: 'Host',
      visibility: 'group',
      timeline: [],
    },
    badge: 'Host',
    tone: 'coral',
  },
];

export const calendarSummary = 'See the month at a glance, then jump straight into the event that matters.';
