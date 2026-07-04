import type { Event, EventMessage, EventTimelineItem, RSVP } from '../../types/domain';

export function selectEventRsvpSummary(rsvps: RSVP[]): string {
  const goingCount = rsvps.filter((rsvp) => rsvp.status === 'going').length;
  return `${goingCount} going`;
}

export function selectEventTimeline(event: Event): EventTimelineItem[] {
  return event.timeline;
}

export function selectEventThreadPreview(thread: EventMessage[]): EventMessage[] {
  return thread;
}
