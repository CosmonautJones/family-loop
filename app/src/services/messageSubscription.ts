import type { ThreadSubscriptionStatus } from './api';

type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type RealtimeSystemPayload = {
  extension: string;
  status: string;
};

type RealtimeChannel = {
  on(
    type: 'postgres_changes',
    filter: { event: '*'; schema: 'public'; table: 'loopedin_event_messages'; filter: string },
    callback: () => void,
  ): RealtimeChannel;
  on(type: 'system', filter: Record<string, never>, callback: (payload: RealtimeSystemPayload) => void): RealtimeChannel;
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
  let postgresReady = false;
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
    .on('system', {}, (payload) => {
      if (!active || payload.extension !== 'postgres_changes') return;
      if (payload.status === 'ok') {
        postgresReady = true;
        onStatus?.('connected');
        onChange();
      } else {
        postgresReady = false;
        onStatus?.('reconnecting');
      }
    })
    .subscribe((status) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        if (!postgresReady) onStatus?.('reconnecting');
      } else {
        postgresReady = false;
        onStatus?.('reconnecting');
      }
    });

  return () => {
    if (!active) return;
    active = false;
    void client.removeChannel(channel).catch(() => undefined);
  };
}
