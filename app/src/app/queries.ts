import { useQuery } from '@tanstack/react-query';
import { loopedInService } from '../services';
import { useLoopedInStore } from '../store/useLoopedInStore';

export function useActiveGroupQuery() {
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  return useQuery({
    queryKey: ['active-group', activeGroupId],
    queryFn: () => loopedInService.groups.getGroup(activeGroupId),
  });
}

export function useGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => loopedInService.groups.listGroups(),
    enabled,
  });
}

export function useActiveEventsQuery() {
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  return useQuery({
    queryKey: ['events', activeGroupId],
    queryFn: () => loopedInService.events.listEvents(activeGroupId),
  });
}

export function useEventRsvpsQuery(eventId: string) {
  return useQuery({
    queryKey: ['rsvps', eventId],
    queryFn: () => loopedInService.rsvps.listRsvps(eventId),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => loopedInService.notifications.listNotifications(),
  });
}
