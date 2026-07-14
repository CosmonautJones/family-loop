import type { ThreadSubscriptionStatus } from './api';

type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type RealtimeChannel = {
  on(
    type: 'postgres_changes',
    filter: { event: '*'; schema: 'public'; table: 'loopedin_event_messages'; filter: string },
    callback: () => void,
  ): RealtimeChannel;
  subscribe(callback: (status: RealtimeStatus) => void): RealtimeChannel;
};

type RealtimeClient = {
  channel(name: string): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): Promise<unknown>;
};

export function subscribeToEventMessages(
  client: RealtimeClient,
  eventId: string,
  onChange: () => void,
  onStatus?: (status: ThreadSubscriptionStatus) => void,
) {
  let active = true;
  const channel = client
    .channel(`event-messages:${eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'loopedin_event_messages',
      filter: `event_id=eq.${eventId}`,
    }, () => {
      if (active) onChange();
    })
    .subscribe((status) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        onStatus?.('connected');
        onChange();
      } else {
        onStatus?.('reconnecting');
      }
    });

  return () => {
    if (!active) return;
    active = false;
    void client.removeChannel(channel).catch(() => undefined);
  };
}
