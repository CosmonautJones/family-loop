import { eventDetail, eventDetails, eventRsvps, eventThread } from '../features/events/fixtures';
import { selectEventRsvpSummary, selectEventThreadPreview, selectEventTimeline } from '../features/events/selectors';
import { groupsOverview } from '../features/groups/fixtures';
import { heroEvent, homeActivity, homeActivityTitle, homeMemories, homeWeekSummary } from '../features/home/fixtures';
import { memoriesRecap } from '../features/memories/fixtures';
import { formatEventDateRange } from '../lib/date';
import type { Event, EventActivity, MemoryItem } from '../types/domain';

type HomeViewModelInput = {
  events?: Event[];
  activity?: EventActivity[];
  memories?: MemoryItem[];
  now?: Date;
};

const defaultHomeInput: HomeViewModelInput = {
  events: [heroEvent],
  activity: homeActivity,
  memories: homeMemories,
};

export function selectHomeViewModel(input: HomeViewModelInput = defaultHomeInput) {
  const events = input.events ?? defaultHomeInput.events ?? [];
  const now = input.now ?? new Date();
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const pastEvents = events
    .filter((event) => new Date(event.startsAt).getTime() < now.getTime())
    .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime());
  const nextEvent = upcomingEvents[0] ?? pastEvents[0];
  const activity = nextEvent ? input.activity ?? defaultHomeInput.activity ?? [] : [];
  const memories = nextEvent ? input.memories ?? defaultHomeInput.memories ?? [] : [];

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
    weekSummary: nextEvent ? homeWeekSummary : 'No upcoming events yet',
    recentActivityTitle: homeActivityTitle,
    activity,
    memories: memories.map((memory) => ({
      eyebrow: memory.resurfacedLabel,
      title: memory.title,
      coverUri: memory.coverUri,
      subtitle: `${memory.photoCount || memory.peopleCount} moments · ${memory.tags.join(', ')}`,
    })),
  };
}

export function selectCalendarViewModel(events: Event[] = []) {
  const sortedEvents = [...events].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const monthDate = sortedEvents[0] ? new Date(sortedEvents[0].startsAt) : new Date();
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

export function selectMemoriesViewModel() {
  return {
    title: memoriesRecap.title,
    description: memoriesRecap.description,
    ingredients: `${memoriesRecap.photoCount} photos · ${memoriesRecap.peopleCount} people · ${memoriesRecap.commentCount} comments worth resurfacing`,
    tags: memoriesRecap.tags.join(', '),
    resurfacedLabel: memoriesRecap.resurfacedLabel,
    coverUri: memoriesRecap.coverUri,
    photoUris: memoriesRecap.photoUris,
  };
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
