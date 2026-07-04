export const heroEvent = {
  title: 'Lake Picnic with Family',
  timeLabel: 'Next up · Today 6:30 PM',
  description: 'One event page for reminders, chat, and the shared album after sunset.',
};

export const appSections = {
  weekSummary: '4 events · 2 reminders · 1 recap ready',
  recentActivityTitle: 'The event stays at the center of the conversation.',
  activity: [
    { title: 'Emma added 12 photos', detail: 'Zoo day recap is ready', badge: 'Recap' },
    { title: 'Dinner moved to 7:30', detail: 'Everyone sees the update in context', badge: 'Updated' },
  ],
  memories: [
    { eyebrow: 'On this day', title: 'Summer fireworks recap' },
    { eyebrow: 'Coming soon', title: 'Friday dinner club' },
  ],
} as const;
