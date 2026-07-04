import type {
  Group,
  Event,
  RSVP,
  EventActivity,
  EventMessage,
  MemoryItem,
} from '../types/domain';

// ── Auth ────────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  displayName: string;
  token: string;
  expiresAt: string;
}

export interface AuthApi {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  refreshSession(): Promise<AuthSession>;
}

// ── Groups ──────────────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  description: string;
  kind: 'family' | 'friends';
}

export interface GroupsApi {
  listGroups(): Promise<Group[]>;
  getGroup(groupId: string): Promise<Group | null>;
  createGroup(payload: CreateGroupPayload): Promise<Group>;
  updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description'>>): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;
}

// ── Events ──────────────────────────────────────────────────────────────

export interface CreateEventPayload {
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
}

export interface UpdateEventPayload {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
}

export interface EventsApi {
  listEvents(groupId?: string): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | null>;
  createEvent(payload: CreateEventPayload): Promise<Event>;
  updateEvent(eventId: string, patch: UpdateEventPayload): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
}

// ── RSVPs ───────────────────────────────────────────────────────────────

export interface CreateRsvpPayload {
  eventId: string;
  status: RSVP['status'];
  note?: string;
}

export interface RsvpsApi {
  listRsvps(eventId: string): Promise<RSVP[]>;
  createRsvp(payload: CreateRsvpPayload): Promise<RSVP>;
  updateRsvp(eventId: string, patch: { status: RSVP['status']; note?: string }): Promise<RSVP>;
  deleteRsvp(eventId: string): Promise<void>;
}

// ── Activity / Thread ───────────────────────────────────────────────────

export interface ActivityApi {
  listRecentActivity(): Promise<EventActivity[]>;
}

export interface ThreadApi {
  listMessages(eventId: string): Promise<EventMessage[]>;
  sendMessage(eventId: string, body: string): Promise<EventMessage>;
}

// ── Media ───────────────────────────────────────────────────────────────

export interface MediaUploadPayload {
  eventId: string;
  fileUri: string;
  caption?: string;
}

export interface MediaItem {
  id: string;
  eventId: string;
  uri: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MediaApi {
  uploadMedia(payload: MediaUploadPayload): Promise<MediaItem>;
  listMedia(eventId: string): Promise<MediaItem[]>;
  deleteMedia(mediaId: string): Promise<void>;
}

// ── Notifications ───────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  kind: 'rsvp' | 'message' | 'media' | 'reminder' | 'event_update';
  title: string;
  body: string;
  eventId?: string;
  groupId?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsApi {
  listNotifications(): Promise<NotificationItem[]>;
  markRead(notificationId: string): Promise<void>;
  clearAll(): Promise<void>;
}

// ── Aggregate service contract ──────────────────────────────────────────

export interface LoopService {
  auth: AuthApi;
  groups: GroupsApi;
  events: EventsApi;
  rsvps: RsvpsApi;
  activity: ActivityApi;
  thread: ThreadApi;
  media: MediaApi;
  notifications: NotificationsApi;
}