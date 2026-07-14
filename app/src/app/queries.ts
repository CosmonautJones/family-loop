import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loopedInService } from '../services';
import type { CreateEventPayload, CreateRsvpPayload } from '../services/api';
import { useLoopedInStore } from '../store/useLoopedInStore';

export const queryKeys = {
  groups: ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
  events: (groupId: string) => ['events', groupId] as const,
  event: (eventId: string) => ['event', eventId] as const,
  rsvps: (eventId: string) => ['rsvps', eventId] as const,
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
