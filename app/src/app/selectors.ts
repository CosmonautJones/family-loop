import { calendarAgenda, calendarEvents, calendarSummary } from '../features/calendar/fixtures';
import { eventDetail, eventRsvps, eventThread } from '../features/events/fixtures';
import { selectEventRsvpSummary, selectEventThreadPreview, selectEventTimeline } from '../features/events/selectors';
import { groupsOverview } from '../features/groups/fixtures';
import { heroEvent, homeActivity, homeActivityTitle, homeMemories, homeWeekSummary } from '../features/home/fixtures';
import { memoriesRecap } from '../features/memories/fixtures';
import { formatEventDateRange } from '../lib/date';

export function selectHomeViewModel() {
  return {
    heroEvent: {
      title: heroEvent.title,
      timeLabel: `${heroEvent.statusLabel} · ${formatEventDateRange(heroEvent.startsAt, heroEvent.endsAt)}`,
      description: heroEvent.description,
    },
    weekSummary: homeWeekSummary,
    recentActivityTitle: homeActivityTitle,
    activity: homeActivity,
    memories: homeMemories.map((memory) => ({
      eyebrow: memory.resurfacedLabel,
      title: memory.title,
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
  };
}

export function selectEventDetailViewModel() {
  return {
    title: eventDetail.title,
    timeLabel: formatEventDateRange(eventDetail.startsAt, eventDetail.endsAt),
    description: eventDetail.description,
    rsvpSummary: selectEventRsvpSummary(eventRsvps),
    sections: selectEventTimeline(eventDetail),
    thread: selectEventThreadPreview(eventThread),
  };
}
