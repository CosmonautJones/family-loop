import {
  calendarDays,
  eventCollection,
  getEventById,
  getFeaturedEvent,
} from '../features/events';

export { getFeaturedEvent, getEventById, eventCollection, calendarDays } from '../features/events';

export const heroEvent = getFeaturedEvent();
const movieNight = getEventById('movie-night');

export const appSections = {
  weekSummary: '4 events · 2 reminders · 1 recap ready',
  recentActivityTitle: 'The event stays at the center of the conversation.',
  calendarSummary: 'See the month at a glance, then jump straight into the event that matters.',
  activity: [
    { title: 'Emma added 12 photos', detail: 'Zoo day recap is ready', badge: 'Recap' },
    { title: 'Dinner moved to 7:30', detail: 'Everyone sees the update in context', badge: 'Updated' },
  ],
  agenda: eventCollection.map((event) => ({
    title: `${event.month} ${event.day} · ${event.title}`,
    detail: `${event.timeLabel} · ${event.location}`,
    badge: event.statusLabel,
    tone: event.statusLabel === 'Host' ? ('coral' as const) : event.statusLabel === 'Maybe' ? ('sky' as const) : ('sage' as const),
  })),
  memories: [
    { eyebrow: 'On this day', title: 'Summer fireworks recap' },
    { eyebrow: 'Coming soon', title: movieNight.title },
  ],
} as const;

export const calendarEvents = calendarDays;

export const eventDetail = getEventById('birthday-brunch');

export const eventThread = eventDetail.thread;

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
