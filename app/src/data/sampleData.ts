export const heroEvent = {
  eyebrow: 'Next up · Today 6:30 PM',
  title: 'Lake Picnic with Family',
  copy: 'One event page for reminders, chat, and the shared album after sunset.',
  primaryAction: 'Open event',
  secondaryAction: 'Add reminder',
} as const;

export const weeklySummary = {
  title: 'This week',
  copy: '4 events · 2 reminders · 1 recap ready',
  badge: 'Agenda',
} as const;

export const activityFeed = [
  {
    title: 'Emma added 12 photos',
    copy: 'Zoo day recap is ready',
    badge: 'Recap',
    tone: 'coral',
  },
  {
    title: 'Dinner moved to 7:30',
    copy: 'Everyone sees the update in context',
    badge: 'Updated',
    tone: 'sky',
  },
] as const;

export const memoryHighlights = [
  {
    eyebrow: 'On this day',
    title: 'Summer fireworks recap',
    tone: 'coral',
  },
  {
    eyebrow: 'Coming soon',
    title: 'Friday dinner club',
    tone: 'sage',
  },
] as const;

export const appSections = [
  { key: 'home', label: 'Home' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'memories', label: 'Memories' },
] as const;

export type AppSectionKey = (typeof appSections)[number]['key'];
