import { eventDetail, eventDetails, eventRsvps, eventThread } from '../features/events/fixtures';
import { selectEventRsvpSummary, selectEventThreadPreview, selectEventTimeline } from '../features/events/selectors';
import { groupsOverview } from '../features/groups/fixtures';
import type { DerivedEventHistory } from '../features/memories/derivedHistory';
import { formatEventDateRange } from '../lib/date';
import type { Event, Group, GroupMember } from '../types/domain';

type HomeViewModelInput = {
  events?: Event[];
  history?: DerivedEventHistory[];
  now?: Date;
};

export const appTabs = ['Home', 'Calendar', 'Create', 'Memories', 'Family'] as const;
export type AppTab = (typeof appTabs)[number];
// Bottom-bar destinations (redesign: 3 tabs). Create is a FAB, Family lives behind
// the header avatar — both remain routable AppTabs, just not tab-bar items.
export const navTabs = ['Home', 'Calendar', 'Memories'] as const satisfies readonly AppTab[];
export type AppRoute =
  | { surface: AppTab }
  | { surface: 'EventDetail'; eventId: string; returnTab: AppTab };

const tabSlugs: Record<AppTab, string> = {
  Home: 'home', Calendar: 'calendar', Create: 'create', Memories: 'memories', Family: 'family',
};

function tabFromSlug(slug: string | null): AppTab | undefined {
  return appTabs.find((tab) => tabSlugs[tab] === slug?.toLowerCase());
}

export function parseAppRoute(hash: string): AppRoute {
  const route = hash.replace(/^#/, '');
  const [pathname, query = ''] = route.split('?');
  const tab = tabFromSlug(pathname.replace(/^\//, ''));
  if (tab) return { surface: tab };
  const match = pathname.match(/^\/event\/([^/]+)$/);
  if (match) {
    try {
      const eventId = decodeURIComponent(match[1]);
      if (eventId) return {
        surface: 'EventDetail',
        eventId,
        returnTab: tabFromSlug(new URLSearchParams(query).get('from')) ?? 'Home',
      };
    } catch { /* Invalid routes safely return Home. */ }
  }
  return { surface: 'Home' };
}

export function formatAppRoute(route: AppRoute): string {
  if (route.surface !== 'EventDetail') return `#/${tabSlugs[route.surface]}`;
  return `#/event/${encodeURIComponent(route.eventId)}?from=${tabSlugs[route.returnTab]}`;
}

export function selectHomeViewModel(input: HomeViewModelInput = {}) {
  const events = input.events ?? [];
  const now = input.now ?? new Date();
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const nextEvent = upcomingEvents[0];
  const history = input.history ?? [];
  const activity = history.flatMap((item) => [
    ...item.messages.map((message) => ({
      id: message.id,
      eventId: item.event.id,
      actor: message.author,
      title: `${message.authorName} commented on ${item.event.title}`,
      detail: message.body,
      badge: 'Comment',
      tone: 'sky' as const,
      createdAt: message.createdAt,
    })),
    ...item.media.map((media) => ({
      id: media.id,
      eventId: item.event.id,
      actor: undefined,
      title: `A photo was shared from ${item.event.title}`,
      detail: media.caption,
      badge: 'Photo',
      tone: 'coral' as const,
      createdAt: media.uploadedAt,
    })),
  ]).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 4);

  return {
    heroEvent: nextEvent ? {
      id: nextEvent.id,
      title: nextEvent.title,
      timeLabel: `${nextEvent.statusLabel} · ${formatEventDateRange(nextEvent.startsAt, nextEvent.endsAt)}`,
      location: nextEvent.location,
      description: nextEvent.description,
      coverUri: nextEvent.coverUri ?? '',
    } : null,
    upcomingEvents: upcomingEvents.slice(1).map((event) => ({
      id: event.id,
      title: event.title,
      detail: `${formatEventDateRange(event.startsAt, event.endsAt)} · ${event.location}`,
    })),
    weekSummary: upcomingEvents.length === 1 ? '1 upcoming family plan' : `${upcomingEvents.length} upcoming family plans`,
    recentActivityTitle: 'From completed family events',
    activity,
    memories: history.filter((item) => item.media.length > 0).slice(0, 2).map((item) => ({
      eventId: item.event.id,
      eyebrow: 'Completed event',
      title: item.event.title,
      coverUri: item.media[0].uri,
      subtitle: `${item.media.length} ${item.media.length === 1 ? 'photo' : 'photos'} · ${item.messages.length} ${item.messages.length === 1 ? 'comment' : 'comments'}`,
    })),
  };
}

export function selectCalendarViewModel(events: Event[] = [], now = new Date()) {
  const sortedEvents = events
    .filter((event) => new Date(event.endsAt).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const monthDate = sortedEvents[0] ? new Date(sortedEvents[0].startsAt) : now;
  const month = monthDate.toLocaleDateString('en-US', { month: 'long' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const eventDays = new Set(sortedEvents
    .filter((event) => new Date(event.startsAt).getMonth() === monthDate.getMonth())
    .map((event) => new Date(event.startsAt).getDate()));

  return {
    calendarSummary: sortedEvents.length === 1 ? '1 shared plan' : `${sortedEvents.length} shared plans`,
    month,
    calendarEvents: Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, highlight: eventDays.has(index + 1) })),
    agenda: sortedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      detail: `${formatEventDateRange(event.startsAt, event.endsAt)} · ${event.location}`,
      badge: event.statusLabel,
      tone: 'sky' as const,
    })),
  };
}

export function selectGroupsViewModel() {
  return {
    description: groupsOverview.description,
    groups: groupsOverview.groups.map((group) => ({
      name: group.name,
      detail: `${group.description} · ${group.memberCount} members`,
      badge: group.badge,
      tone: group.tone,
    })),
    steps: groupsOverview.steps,
  };
}

export function selectFamilyViewModel(group: Group, members: GroupMember[], events: Event[], now = new Date()) {
  const upcoming = [...events]
    .filter((event) => Date.parse(event.endsAt) >= now.getTime())
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  return {
    name: group.name,
    description: group.description,
    memberCountLabel: `${members.length} family members`,
    members: members.map((member) => ({
      ...member,
      role: member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Organizer' : 'Family member',
    })),
    upcomingLabel: upcoming.length === 0
      ? 'No upcoming trips yet.'
      : upcoming.length === 1
        ? `1 upcoming trip · ${upcoming[0].title}`
        : `${upcoming.length} upcoming trips · Next: ${upcoming[0].title}`,
  };
}

export function selectMemoriesViewModel(history: DerivedEventHistory[]) {
  return history.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    detail: `${formatEventDateRange(item.event.startsAt, item.event.endsAt)} · ${item.event.location}`,
    description: item.event.description,
    photoCount: item.media.length,
    commentCount: item.messages.length,
    coverUri: item.media[0]?.uri ?? item.event.coverUri ?? '',
  }));
}

export function selectEventDetailViewModel(
  eventOrId: Event | string = eventDetail,
  rsvps = eventRsvps,
  thread = eventThread,
) {
  const selectedEvent = typeof eventOrId === 'string'
    ? eventDetails.find((event) => event.id === eventOrId)
    : eventOrId;

  if (!selectedEvent) return null;

  return {
    id: selectedEvent.id,
    title: selectedEvent.title,
    timeLabel: formatEventDateRange(selectedEvent.startsAt, selectedEvent.endsAt),
    location: selectedEvent.location,
    description: selectedEvent.description,
    rsvpSummary: selectEventRsvpSummary(rsvps),
    sections: selectEventTimeline(selectedEvent),
    thread: selectEventThreadPreview(thread),
  };
}
