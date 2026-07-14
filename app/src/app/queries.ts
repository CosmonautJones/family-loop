import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loopedInService } from '../services';
import type { CreateEventPayload, CreateRsvpPayload, MediaUploadPayload } from '../services/api';
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

export function useUpsertRsvpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRsvpPayload) => loopedInService.rsvps.upsertRsvp(payload),
    onSuccess: (rsvp) => queryClient.invalidateQueries({ queryKey: queryKeys.rsvps(rsvp.eventId) }),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => loopedInService.notifications.listNotifications(),
  });
}
