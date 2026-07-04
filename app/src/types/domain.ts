import type { AccentTone } from './ui';

export type GroupId = string;
export type EventId = string;
export type PersonId = string;
export type MemoryId = string;

export type Group = {
  id: GroupId;
  name: string;
  description: string;
  kind: 'family' | 'friends';
  badge: string;
  tone: AccentTone;
  memberCount: number;
};

export type RSVPStatus = 'going' | 'maybe' | 'declined';

export type RSVP = {
  eventId: EventId;
  personId: PersonId;
  personName: string;
  status: RSVPStatus;
  note?: string;
};

export type EventActivity = {
  id: string;
  eventId: EventId;
  title: string;
  detail: string;
  badge: string;
  tone: AccentTone;
  createdAt: string;
};

export type EventTimelineItem = {
  title: string;
  detail: string;
};

export type EventMessage = {
  id: string;
  eventId: EventId;
  body: string;
  authorName: string;
  self: boolean;
  createdAt: string;
};

export type Event = {
  id: EventId;
  groupId: GroupId;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  statusLabel: string;
  visibility: 'group';
  timeline: EventTimelineItem[];
};

export type MemoryItem = {
  id: MemoryId;
  eventId: EventId;
  title: string;
  description: string;
  capturedOn: string;
  photoCount: number;
  peopleCount: number;
  commentCount: number;
  tags: string[];
  resurfacedLabel: string;
};
