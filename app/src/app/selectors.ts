import { calendarAgenda, calendarEvents, calendarSummary } from '../features/calendar/fixtures';
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
};

const defaultHomeInput: HomeViewModelInput = {
  events: [heroEvent],
  activity: homeActivity,
  memories: homeMemories,
};

export function selectHomeViewModel(input: HomeViewModelInput = defaultHomeInput) {
  const events = input.events ?? defaultHomeInput.events ?? [];
  const nextEvent = events[0];
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
    weekSummary: homeWeekSummary,
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

export function selectCalendarViewModel() {
  return {
    calendarSummary,
    calendarEvents,
    agenda: calendarAgenda.map((item) => ({
      title: item.event.title,
      detail: `${item.event.location} · ${item.badge}`,
      badge: item.badge,
      tone: item.tone,
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

export function selectEventDetailViewModel(eventId: string = eventDetail.id) {
  const selectedEvent = eventDetails.find((event) => event.id === eventId) ?? eventDetail;

  return {
    id: selectedEvent.id,
    title: selectedEvent.title,
    timeLabel: formatEventDateRange(selectedEvent.startsAt, selectedEvent.endsAt),
    location: selectedEvent.location,
    description: selectedEvent.description,
    rsvpSummary: selectEventRsvpSummary(eventRsvps),
    sections: selectEventTimeline(selectedEvent),
    thread: selectEventThreadPreview(eventThread),
  };
}
