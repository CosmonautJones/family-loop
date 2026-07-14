import type { Event, EventMessage, MediaItem } from '../../types/domain';

export type DerivedEventHistory = {
  event: Event;
  messages: EventMessage[];
  media: MediaItem[];
  latestActivityAt: string;
};

export function selectCompletedEvents(events: Event[], now = new Date()) {
  return [...events]
    .filter((event) => Date.parse(event.endsAt) < now.getTime())
    .sort((left, right) => Date.parse(right.endsAt) - Date.parse(left.endsAt));
}

export function deriveEventHistory(event: Event, messages: EventMessage[], media: MediaItem[]): DerivedEventHistory {
  const eventMessages = messages.filter((message) => message.eventId === event.id);
  const eventMedia = media.filter((item) => item.eventId === event.id);
  const latestActivityAt = [...eventMessages.map((message) => message.createdAt), ...eventMedia.map((item) => item.uploadedAt), event.endsAt]
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  return { event, messages: eventMessages, media: eventMedia, latestActivityAt };
}
