import type {
  Group,
  Event,
  RSVP,
  EventActivity,
  EventMessage,
  MediaItem,
  GroupMember,
} from '../types/domain';

export interface AuthSession {
  userId: string;
  displayName: string;
  token: string;
  expiresAt: string;
}

export type AuthSignUpResult =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'confirmationRequired' };

export interface AuthApi {
  login(email: string, password: string): Promise<AuthSession>;
  signUp(invitationToken: string, displayName: string, email: string, password: string): Promise<AuthSignUpResult>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(listener: (session: AuthSession | null, passwordRecovery?: boolean) => void): () => void;
  refreshSession(): Promise<AuthSession>;
  listLocalProfiles(): Promise<GroupMember[]>;
  chooseLocalProfile(personId: string): Promise<AuthSession>;
}

export interface CreateGroupPayload {
  creationKey: string;
  name: string;
  description: string;
  kind: 'family' | 'friends';
}

export type GroupInvitationPreview =
  | { status: 'ready'; groupId: string; groupName: string; inviterName: string; maskedEmail: string; expiresAt: string }
  | { status: 'unavailable' };

export interface GroupInvitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface CreatedGroupInvitation {
  invitationId: string;
  status: 'created' | 'existing';
  expiresAt: string;
}

export type GroupActionStatus = 'joined' | 'declined' | 'revoked' | 'removed' | 'not_member' | 'left' | 'transferred' | 'already_owner';

export interface GroupActionResult {
  status: GroupActionStatus;
  groupId?: string;
}

export interface GroupsApi {
  listGroups(): Promise<Group[]>;
  listGroupMembers(groupId: string): Promise<GroupMember[]>;
  getGroup(groupId: string): Promise<Group | null>;
  createGroup(payload: CreateGroupPayload): Promise<Group>;
  canCreateGroup(): Promise<boolean>;
  validateInvitation(token: string): Promise<GroupInvitationPreview>;
  acceptInvitation(token: string): Promise<GroupActionResult>;
  declineInvitation(token: string): Promise<GroupActionResult>;
  createInvitation(groupId: string, email: string, token: string): Promise<CreatedGroupInvitation>;
  listInvitations(groupId: string): Promise<GroupInvitation[]>;
  revokeInvitation(invitationId: string): Promise<GroupActionResult>;
  removeMember(groupId: string, userId: string): Promise<GroupActionResult>;
  leaveGroup(groupId: string): Promise<GroupActionResult>;
  transferOwnership(groupId: string, userId: string): Promise<GroupActionResult>;
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
  subscribeMessages(eventId: string, onChange: () => void, onStatus?: (status: ThreadSubscriptionStatus) => void): () => void;
}

export type ThreadSubscriptionStatus = 'connected' | 'reconnecting';

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
