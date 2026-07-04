export const heroEvent = {
  title: 'Lake Picnic with Family',
  timeLabel: 'Next up · Today 6:30 PM',
  description: 'One event page for reminders, chat, and the shared album after sunset.',
};

export const appSections = {
  weekSummary: '4 events · 2 reminders · 1 recap ready',
  recentActivityTitle: 'The event stays at the center of the conversation.',
  calendarSummary: 'See the month at a glance, then jump straight into the event that matters.',
  activity: [
    { title: 'Emma added 12 photos', detail: 'Zoo day recap is ready', badge: 'Recap' },
    { title: 'Dinner moved to 7:30', detail: 'Everyone sees the update in context', badge: 'Updated' },
  ],
  agenda: [
    { title: 'Today · Lake picnic', detail: '6:30 PM · 8 going', badge: 'Open', tone: 'sage' as const },
    { title: 'Jul 18 · Rooftop movie night', detail: 'Poll live · Snacks assigned', badge: 'Maybe', tone: 'sky' as const },
    { title: 'Jul 25 · Family birthday brunch', detail: 'Gallery enabled · Host view', badge: 'Host', tone: 'coral' as const },
  ],
  memories: [
    { eyebrow: 'On this day', title: 'Summer fireworks recap' },
    { eyebrow: 'Coming soon', title: 'Friday dinner club' },
  ],
} as const;

export const calendarEvents = [
  { day: 1, highlight: false },
  { day: 2, highlight: false },
  { day: 3, highlight: false },
  { day: 4, highlight: false },
  { day: 5, highlight: true },
  { day: 6, highlight: false },
  { day: 7, highlight: false },
  { day: 8, highlight: false },
  { day: 9, highlight: false },
  { day: 10, highlight: true },
  { day: 11, highlight: false },
  { day: 12, highlight: true },
  { day: 13, highlight: false },
  { day: 14, highlight: false },
  { day: 15, highlight: false },
  { day: 16, highlight: false },
  { day: 17, highlight: false },
  { day: 18, highlight: true },
  { day: 19, highlight: false },
  { day: 20, highlight: false },
  { day: 21, highlight: false },
  { day: 22, highlight: false },
  { day: 23, highlight: false },
  { day: 24, highlight: false },
  { day: 25, highlight: true },
  { day: 26, highlight: false },
  { day: 27, highlight: false },
  { day: 28, highlight: false },
] as const;

export const eventDetail = {
  title: 'Emma’s Birthday Brunch',
  timeLabel: 'Saturday · Jul 18 · 7:00 PM',
  description: 'The event page is where the plan, guest context, and post-brunch memories stay together.',
  rsvpSummary: '14 going',
  sections: [
    { title: 'Logistics', detail: 'Botanical Garden Cafe · 11:00 AM · Bring wrapped gifts' },
    { title: 'Conversation', detail: 'Parking notes, allergy reminders, and gift coordination live here' },
    { title: 'Afterward', detail: 'Photos and recap stay attached to the event automatically' },
  ],
} as const;

export const eventThread = [
  { body: 'Can someone grab sparkling water and extra napkins?', self: false },
  { body: 'Yep — I’ll bring both and get there a little early.', self: true },
  { body: 'Perfect. I also added the parking note for grandparents.', self: false },
] as const;

export const memoriesRecap = {
  title: 'Summer Cabin Weekend',
  description: 'Plans do not vanish after they happen — they become shared highlights you can revisit and resurface.',
  ingredients: '48 photos · 6 people · 3 comments worth resurfacing',
  tags: 'Fireworks, dock breakfast, grandparents, game night',
} as const;

export const groupsOverview = {
  description: 'Loop starts with one private group, one real event, and just enough setup to feel instantly useful.',
  groups: [
    { name: 'Jones Family', detail: 'Primary family calendar and shared memories', badge: 'Active', tone: 'sage' as const },
    { name: 'Friday Dinner Club', detail: 'Recurring friend-group plans and recaps', badge: 'Friends', tone: 'sky' as const },
  ],
  steps: [
    { title: 'Create the group', detail: 'Name the circle, choose family or friends, and invite the core people first.' },
    { title: 'Start with one event', detail: 'A dinner, birthday, or weekend plan is enough to make the app feel real.' },
    { title: 'Keep the photos attached', detail: 'After the event, upload the highlights so the memory stays where the plan lived.' },
  ],
} as const;
