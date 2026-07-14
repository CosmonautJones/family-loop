import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { deriveEventHistory, selectCompletedEvents } from '../features/memories/derivedHistory';
import { loopedInService } from '../services';
import type { CreateEventPayload, CreateGroupPayload, CreateRsvpPayload, MediaUploadPayload, UpdateEventPayload } from '../services/api';
import { useLoopedInStore } from '../store/useLoopedInStore';

export const queryKeys = {
  groups: ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
  groupMembers: (groupId: string) => ['groups', groupId, 'members'] as const,
  events: (groupId: string) => ['events', groupId] as const,
  event: (eventId: string) => ['event', eventId] as const,
  rsvps: (eventId: string) => ['rsvps', eventId] as const,
  messages: (eventId: string) => ['messages', eventId] as const,
  media: (eventId: string) => ['media', eventId] as const,
  invitation: (token: string) => ['invitation', token] as const,
  invitations: (groupId: string) => ['groups', groupId, 'invitations'] as const,
  canCreateGroup: ['groups', 'can-create'] as const,
  notifications: ['notifications'] as const,
};

export function useActiveGroupQuery() {
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  return useQuery({
    queryKey: queryKeys.group(activeGroupId),
    queryFn: () => loopedInService.groups.getGroup(activeGroupId),
    enabled: Boolean(activeGroupId),
  });
}

export function useGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => loopedInService.groups.listGroups(),
    enabled,
  });
}

export function useCanCreateGroupQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.canCreateGroup,
    queryFn: () => loopedInService.groups.canCreateGroup(),
    enabled,
  });
}

export function useInvitationQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.invitation(token ?? ''),
    queryFn: () => loopedInService.groups.validateInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useGroupInvitationsQuery(groupId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invitations(groupId),
    queryFn: () => loopedInService.groups.listInvitations(groupId),
    enabled: enabled && Boolean(groupId),
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();
  const setActiveGroupId = useLoopedInStore((state) => state.setActiveGroupId);
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => loopedInService.groups.createGroup(payload),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.group(group.id), group);
      queryClient.setQueryData(queryKeys.groups, (current: Array<typeof group> | undefined) => current
        ? [...current.filter((item) => item.id !== group.id), group]
        : [group]);
      setActiveGroupId(group.id);
      return queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  const setActiveGroupId = useLoopedInStore((state) => state.setActiveGroupId);
  return useMutation({
    mutationFn: (token: string) => loopedInService.groups.acceptInvitation(token),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      if (result.groupId) {
        setActiveGroupId(result.groupId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.group(result.groupId) });
      }
    },
  });
}

export function useDeclineInvitationMutation() {
  return useMutation({ mutationFn: (token: string) => loopedInService.groups.declineInvitation(token) });
}

export function useCreateGroupInvitationMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) => loopedInService.groups.createInvitation(groupId, email, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(groupId) }),
  });
}

export function useRevokeGroupInvitationMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => loopedInService.groups.revokeInvitation(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(groupId) }),
  });
}

export function useRemoveGroupMemberMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => loopedInService.groups.removeMember(groupId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) }),
  });
}

export function useLeaveGroupMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => loopedInService.groups.leaveGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useTransferGroupOwnershipMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => loopedInService.groups.transferOwnership(groupId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
    },
  });
}

export function useActiveGroupMembersQuery() {
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  return useQuery({
    queryKey: queryKeys.groupMembers(activeGroupId),
    queryFn: () => loopedInService.groups.listGroupMembers(activeGroupId),
    enabled: Boolean(activeGroupId),
  });
}

export function useActiveEventsQuery() {
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  return useQuery({
    queryKey: queryKeys.events(activeGroupId),
    queryFn: () => loopedInService.events.listEvents(activeGroupId),
    enabled: Boolean(activeGroupId),
  });
}

export function useActiveGroupHistoryQuery() {
  const eventsQuery = useActiveEventsQuery();
  const completedEvents = selectCompletedEvents(eventsQuery.data ?? []);
  const messageQueries = useQueries({
    queries: completedEvents.map((event) => ({ queryKey: queryKeys.messages(event.id), queryFn: () => loopedInService.thread.listMessages(event.id) })),
  });
  const mediaQueries = useQueries({
    queries: completedEvents.map((event) => ({ queryKey: queryKeys.media(event.id), queryFn: () => loopedInService.media.listMedia(event.id) })),
  });
  const detailQueries = [...messageQueries, ...mediaQueries];
  const detailPending = detailQueries.some((query) => query.isPending);
  const detailError = detailQueries.find((query) => query.isError)?.error;
  const history = completedEvents.map((event, index) => deriveEventHistory(
    event,
    messageQueries[index]?.data ?? [],
    mediaQueries[index]?.data ?? [],
  ));

  return {
    data: eventsQuery.isSuccess && !detailPending && !detailError ? history : undefined,
    error: eventsQuery.error ?? detailError ?? null,
    isPending: eventsQuery.isPending || detailPending,
    isError: eventsQuery.isError || Boolean(detailError),
    isSuccess: eventsQuery.isSuccess && !detailPending && !detailError,
    refetch: async () => {
      await eventsQuery.refetch();
      await Promise.all([...messageQueries, ...mediaQueries].map((query) => query.refetch()));
    },
  };
}

export function useEventQuery(eventId: string) {
  return useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => loopedInService.events.getEvent(eventId),
    enabled: Boolean(eventId),
  });
}

export function useEventRsvpsQuery(eventId: string) {
  return useQuery({
    queryKey: queryKeys.rsvps(eventId),
    queryFn: () => loopedInService.rsvps.listRsvps(eventId),
    enabled: Boolean(eventId),
  });
}

export function useEventMessagesQuery(eventId: string) {
  return useQuery({
    queryKey: queryKeys.messages(eventId),
    queryFn: () => loopedInService.thread.listMessages(eventId),
    enabled: Boolean(eventId),
  });
}

export function useEventMediaQuery(eventId: string) {
  return useQuery({
    queryKey: queryKeys.media(eventId),
    queryFn: () => loopedInService.media.listMedia(eventId),
    enabled: Boolean(eventId),
  });
}

export function useUploadMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MediaUploadPayload) => loopedInService.media.uploadMedia(payload),
    onSuccess: (media) => queryClient.invalidateQueries({ queryKey: queryKeys.media(media.eventId) }),
  });
}

export function useDeleteMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId }: { eventId: string; mediaId: string }) => loopedInService.media.deleteMedia(mediaId),
    onSuccess: (_result, { eventId }) => queryClient.invalidateQueries({ queryKey: queryKeys.media(eventId) }),
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: string; body: string }) => loopedInService.thread.sendMessage(eventId, body),
    onSuccess: (message) => queryClient.invalidateQueries({ queryKey: queryKeys.messages(message.eventId) }),
  });
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => loopedInService.events.createEvent(payload),
    onSuccess: (event) => {
      queryClient.setQueryData(queryKeys.event(event.id), event);
      return queryClient.invalidateQueries({ queryKey: queryKeys.events(event.groupId) });
    },
  });
}

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, patch }: { eventId: string; patch: UpdateEventPayload }) => loopedInService.events.updateEvent(eventId, patch),
    onSuccess: (event) => {
      queryClient.setQueryData(queryKeys.event(event.id), event);
      return queryClient.invalidateQueries({ queryKey: queryKeys.events(event.groupId) });
    },
  });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string; groupId: string }) => loopedInService.events.deleteEvent(eventId),
    onSuccess: (_result, { eventId, groupId }) => {
      queryClient.removeQueries({ queryKey: queryKeys.event(eventId), exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.rsvps(eventId), exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.messages(eventId), exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.media(eventId), exact: true });
      return queryClient.invalidateQueries({ queryKey: queryKeys.events(groupId) });
    },
  });
}

export function useUpsertRsvpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRsvpPayload) => loopedInService.rsvps.upsertRsvp(payload),
    onSuccess: (rsvp) => queryClient.invalidateQueries({ queryKey: queryKeys.rsvps(rsvp.eventId) }),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => loopedInService.notifications.listNotifications(),
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => loopedInService.notifications.markRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => loopedInService.notifications.clearAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
