import type {
  Group,
  Event,
  RSVP,
  EventActivity,
  EventMessage,
  MemoryItem,
  MediaItem,
  GroupMember,
} from '../types/domain';

export interface AuthSession {
  userId: string;
  displayName: string;
  token: string;
  expiresAt: string;
}

export interface AuthApi {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
  refreshSession(): Promise<AuthSession>;
  listLocalProfiles(): Promise<GroupMember[]>;
  chooseLocalProfile(personId: string): Promise<AuthSession>;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
  kind: 'family' | 'friends';
}

export interface GroupsApi {
  listGroups(): Promise<Group[]>;
  listGroupMembers(groupId: string): Promise<GroupMember[]>;
  getGroup(groupId: string): Promise<Group | null>;
  createGroup(payload: CreateGroupPayload): Promise<Group>;
  updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description'>>): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;
}

export interface CreateEventPayload {
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  coverUri?: string;
}

export interface UpdateEventPayload {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
  coverUri?: string;
}

export interface EventsApi {
  listEvents(groupId?: string): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | null>;
  createEvent(payload: CreateEventPayload): Promise<Event>;
  updateEvent(eventId: string, patch: UpdateEventPayload): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
}

export interface CreateRsvpPayload {
  eventId: string;
  personId?: string;
  personName?: string;
  status: RSVP['status'];
  note?: string;
}

export interface RsvpsApi {
  listRsvps(eventId: string): Promise<RSVP[]>;
  upsertRsvp(payload: CreateRsvpPayload): Promise<RSVP>;
  updateRsvp(eventId: string, personId: string, patch: { status: RSVP['status']; note?: string }): Promise<RSVP>;
  deleteRsvp(eventId: string, personId: string): Promise<void>;
}

export interface ActivityApi {
  listRecentActivity(): Promise<EventActivity[]>;
}

export interface ThreadApi {
  listMessages(eventId: string): Promise<EventMessage[]>;
  sendMessage(eventId: string, body: string): Promise<EventMessage>;
}

export interface MediaUploadPayload {
  eventId: string;
  fileUri: string;
  caption?: string;
  altText: string;
  sourceName?: string;
  sourceUrl?: string;
  creatorName?: string;
  creatorUrl?: string;
}

export interface MediaApi {
  uploadMedia(payload: MediaUploadPayload): Promise<MediaItem>;
  listMedia(eventId: string): Promise<MediaItem[]>;
  deleteMedia(mediaId: string): Promise<void>;
}

export interface NotificationItem {
  id: string;
  userId: string;
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

export interface LoopedInService {
  auth: AuthApi;
  groups: GroupsApi;
  events: EventsApi;
  rsvps: RsvpsApi;
  activity: ActivityApi;
  thread: ThreadApi;
  media: MediaApi;
  notifications: NotificationsApi;
}
