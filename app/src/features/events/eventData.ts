export type EventSection = {
  title: string;
  detail: string;
};

export type EventMessage = {
  body: string;
  self: boolean;
};

export type EventInvitee = {
  name: string;
  role: string;
  status: 'Going' | 'Maybe' | 'Hosting';
};

export type EventRecord = {
  id: string;
  title: string;
  timeLabel: string;
  description: string;
  host: string;
  location: string;
  invitees: readonly EventInvitee[];
  notes: string;
  coverTreatment: string;
  rsvpSummary: string;
  statusLabel: string;
  month: string;
  day: number;
  sections: readonly EventSection[];
  thread: readonly EventMessage[];
};

export type CalendarDay = {
  day: number;
  highlight: boolean;
  eventId?: EventRecord['id'];
};

export const eventCollection: readonly EventRecord[] = [
  {
    id: 'lake-picnic',
    title: 'Lake Picnic with Family',
    timeLabel: 'Next up · Today 6:30 PM',
    description: 'One event page for reminders, chat, and the shared album after sunset.',
    host: 'Maya Jones',
    location: 'Cedar Lake North Lawn',
    invitees: [
      { name: 'Emma', role: 'Cousin', status: 'Going' },
      { name: 'Noah', role: 'Brother', status: 'Going' },
      { name: 'Grandma Rose', role: 'Grandparent', status: 'Maybe' },
    ],
    notes: 'Pack folding chairs, bug spray, and the picnic blanket before 5:45 PM.',
    coverTreatment: 'Golden hour picnic cover with candid family photo.',
    rsvpSummary: '8 going',
    statusLabel: 'Open',
    month: 'Jul',
    day: 12,
    sections: [
      { title: 'Logistics', detail: 'Meet by the north lawn dock at 6:30 PM and park by shelter B.' },
      { title: 'Food plan', detail: 'Sandwiches, fruit, and drinks are split across three households.' },
      { title: 'Afterward', detail: 'Sunset photos and recap stay attached to the event automatically.' },
    ],
    thread: [
      { body: 'Can someone grab sparkling water and extra napkins?', self: false },
      { body: 'Yep — I’ll bring both and get there a little early.', self: true },
      { body: 'Perfect. I also added the parking note for grandparents.', self: false },
    ],
  },
  {
    id: 'movie-night',
    title: 'Rooftop Movie Night',
    timeLabel: 'Jul 18 · Friday 8:15 PM',
    description: 'Friends vote on the movie, snacks, and weather backup in one thread.',
    host: 'Avery Chen',
    location: 'The Marlowe Rooftop',
    invitees: [
      { name: 'Theo', role: 'Friend', status: 'Going' },
      { name: 'Priya', role: 'Friend', status: 'Maybe' },
      { name: 'Jules', role: 'Host', status: 'Hosting' },
    ],
    notes: 'Bring a light jacket and confirm projector power by noon.',
    coverTreatment: 'Night-sky gradient cover with film grain and marquee type.',
    rsvpSummary: '11 invited',
    statusLabel: 'Maybe',
    month: 'Jul',
    day: 18,
    sections: [
      { title: 'Voting', detail: 'Poll closes Thursday night so the host can prep the screen setup.' },
      { title: 'Backup plan', detail: 'Rain moves everyone to the lounge with the same snack assignments.' },
      { title: 'Recap', detail: 'Top quotes and photos become the post-event memory card.' },
    ],
    thread: [
      { body: 'I can bring the extension cord and extra blankets.', self: true },
      { body: 'Amazing — adding you to the setup checklist now.', self: false },
    ],
  },
  {
    id: 'birthday-brunch',
    title: 'Emma’s Birthday Brunch',
    timeLabel: 'Saturday · Jul 25 · 11:00 AM',
    description: 'The event page keeps the plan, guest context, and memories together.',
    host: 'Jordan Jones',
    location: 'Botanical Garden Cafe',
    invitees: [
      { name: 'Emma', role: 'Birthday guest', status: 'Hosting' },
      { name: 'Aunt Mia', role: 'Family', status: 'Going' },
      { name: 'Grandpa Lee', role: 'Family', status: 'Going' },
      { name: 'Sophie', role: 'Friend', status: 'Maybe' },
    ],
    notes: 'Bring wrapped gifts, allergy-safe cupcakes, and print the scavenger cards.',
    coverTreatment: 'Soft floral cover with confetti overlays and birthday title lockup.',
    rsvpSummary: '14 going',
    statusLabel: 'Host',
    month: 'Jul',
    day: 25,
    sections: [
      { title: 'Logistics', detail: 'Botanical Garden Cafe · 11:00 AM · Bring wrapped gifts' },
      { title: 'Conversation', detail: 'Parking notes, allergy reminders, and gift coordination live here.' },
      { title: 'Afterward', detail: 'Photos and recap stay attached to the event automatically.' },
    ],
    thread: [
      { body: 'Can someone pick up the number candles on the way in?', self: false },
      { body: 'I’ve got them, plus the extra cupcake toppers.', self: true },
      { body: 'Perfect — adding that to the brunch checklist.', self: false },
    ],
  },
] as const;

export const calendarDays: readonly CalendarDay[] = Array.from({ length: 28 }, (_, index) => {
  const day = index + 1;
  const matchedEvent = eventCollection.find((event) => event.day === day);

  return {
    day,
    highlight: Boolean(matchedEvent),
    eventId: matchedEvent?.id,
  };
});

export const draftEventTemplate = {
  title: 'Neighborhood potluck on the green',
  dateLabel: 'Sun · Aug 3',
  timeLabel: '4:30 PM',
  location: 'Maple Grove Commons',
  notes: 'Ask each household to claim one dish and bring lawn games for kids.',
  invitees: ['Jones Family', 'Chen Family', 'Avery + Theo', 'Grandma Rose'],
  coverTreatment: 'Pastel picnic collage with room for a hero family photo.',
} as const;

export function getFeaturedEvent() {
  return eventCollection[0];
}

export function getEventById(id: EventRecord['id']) {
  return eventCollection.find((event) => event.id === id) ?? eventCollection[0];
}
