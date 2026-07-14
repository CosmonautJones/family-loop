import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { PhotoCard } from '../components/PhotoCard';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectHomeViewModel } from '../app/selectors';
import { useActiveEventsQuery, useActiveGroupHistoryQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery } from '../app/queries';
import { palette, spacing } from '../theme/tokens';

export function HomeScreen({ onOpenEvent, onCreateEvent }: { onOpenEvent?: (eventId: string) => void; onCreateEvent?: () => void }) {
  const eventsQuery = useActiveEventsQuery();
  const historyQuery = useActiveGroupHistoryQuery();
  const notificationsQuery = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const appSections = selectHomeViewModel({ events: eventsQuery.data ?? [], history: historyQuery.data ?? [] });
  const heroEvent = appSections.heroEvent;

  if (eventsQuery.isPending) return <ScreenState title="Loading your plans" detail="Finding what’s next for this group…" />;
  if (eventsQuery.isError) return <ScreenState title="We couldn’t load your plans" detail={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Try again in a moment.'} onRetry={() => eventsQuery.refetch()} />;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>What’s next</Text>
        {heroEvent ? (
          <View>
            <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>{heroEvent.title}</Text>
            <Text style={styles.subtitle}>{heroEvent.timeLabel} · {heroEvent.location}</Text>
            <PhotoCard uri={heroEvent.coverUri} title={heroEvent.title} subtitle={heroEvent.description} height={260} />
            <View style={styles.heroActions}>
              <Button label="Open event" onPress={() => onOpenEvent?.(heroEvent.id)} />
            </View>
          </View>
        ) : (
          <SurfaceCard>
            <Text style={styles.cardTitle}>No events planned yet</Text>
            <Text style={styles.cardCopy}>Create the first event for this group so everyone knows what’s next.</Text>
            <Button label="Create event" onPress={onCreateEvent} />
          </SurfaceCard>
        )}

        <SurfaceCard>
          <View style={styles.rowBetween}>
            <View style={styles.flexCopy}><Text style={styles.cardTitle}>Updates</Text><Text style={styles.cardCopy}>The latest changes across your family.</Text></View>
            {notificationsQuery.data?.some((item) => !item.read) ? <Chip label={`${notificationsQuery.data.filter((item) => !item.read).length} unread`} tone="coral" /> : null}
          </View>
          {notificationsQuery.isPending ? <View accessibilityLiveRegion="polite"><Text style={styles.cardCopy}>Loading family updates…</Text></View> : null}
          {notificationsQuery.isError ? <View accessibilityLiveRegion="polite"><Text accessibilityRole="alert" style={styles.errorCopy}>Updates are unavailable right now.</Text><Button label="Retry updates" tone="secondary" onPress={() => notificationsQuery.refetch()} /></View> : null}
          {notificationsQuery.isSuccess && notificationsQuery.data.length === 0 ? <Text style={styles.cardCopy}>No updates yet. New comments, photos, and plan changes will appear here.</Text> : null}
          {notificationsQuery.isSuccess ? [...notificationsQuery.data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3).map((item) => (
            <View key={item.id} style={[styles.updateItem, !item.read && styles.updateUnread]}>
              <View style={styles.flexCopy}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.cardCopy}>{item.body}</Text><Text style={styles.updateTime}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>
              {item.eventId ? <Button label={`Open update: ${item.title}`} tone="secondary" disabled={markRead.isPending} onPress={async () => { if (!item.read) await markRead.mutateAsync(item.id); onOpenEvent?.(item.eventId!); }} /> : !item.read ? <Button label={`Mark ${item.title} read`} tone="secondary" disabled={markRead.isPending} onPress={() => markRead.mutate(item.id)} /> : null}
            </View>
          )) : null}
          {notificationsQuery.isSuccess && notificationsQuery.data.some((item) => !item.read) ? <Button label={markAllRead.isPending ? 'Marking updates read…' : 'Mark all read'} tone="secondary" disabled={markAllRead.isPending} onPress={() => markAllRead.mutate()} /> : null}
          {markRead.isError || markAllRead.isError ? <Text accessibilityRole="alert" style={styles.errorCopy}>We couldn’t update read status. Try again.</Text> : null}
        </SurfaceCard>

        {heroEvent ? <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Upcoming plans</Text>
              <Text style={styles.cardCopy}>{appSections.weekSummary}</Text>
            </View>
            <Chip label="Agenda" tone="sky" />
          </View>
        </SurfaceCard> : null}

        {appSections.upcomingEvents.length > 0 ? <SurfaceCard>
          <Text style={styles.cardTitle}>Also coming up</Text>
          <View style={styles.upcomingList}>
            {appSections.upcomingEvents.map((event) => (
              <View key={event.id} style={styles.upcomingItem}>
                <View style={styles.upcomingCopy}>
                  <Text style={styles.listTitle}>{event.title}</Text>
                  <Text style={styles.cardCopy}>{event.detail}</Text>
                </View>
                <Button label={`Open ${event.title}`} tone="secondary" onPress={() => onOpenEvent?.(event.id)} />
              </View>
            ))}
          </View>
        </SurfaceCard> : null}

        {historyQuery.isPending ? <SurfaceCard><Text style={styles.cardTitle}>Loading recent family history</Text><Text style={styles.cardCopy}>Gathering comments and photos from completed events…</Text></SurfaceCard> : null}
        {historyQuery.isError ? <SurfaceCard><Text style={styles.cardTitle}>Recent history is unavailable</Text><Text style={styles.cardCopy}>{historyQuery.error instanceof Error ? historyQuery.error.message : 'Try again in a moment.'}</Text><Button label="Retry history" tone="secondary" onPress={() => historyQuery.refetch()} /></SurfaceCard> : null}
        {historyQuery.isSuccess && appSections.activity.length === 0 ? <SurfaceCard><Text style={styles.cardTitle}>No recent comments or photos</Text><Text style={styles.cardCopy}>New activity from completed family events will appear here.</Text></SurfaceCard> : null}
        {historyQuery.isSuccess && appSections.activity.length > 0 ? <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Recent activity</Text>
              <Text style={styles.cardCopy}>{appSections.recentActivityTitle}</Text>
            </View>
            <Chip label="Recent" tone="coral" />
          </View>
          <View style={styles.divider} />
          {appSections.activity.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.activityMain}>
                <Avatar uri={item.actor?.avatarUri} initials={item.actor?.initials ?? 'LI'} />
                <View>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.cardCopy}>{item.detail}</Text>
                </View>
              </View>
              <Chip label={item.badge} tone={item.tone} />
            </View>
          ))}
        </SurfaceCard> : null}

        {historyQuery.isSuccess && appSections.memories.length > 0 ? <View style={styles.memoryRow}>
          {appSections.memories.map((memory) => (
            <View key={memory.eventId} style={styles.memoryTile}>
              <PhotoCard uri={memory.coverUri} title={memory.title} subtitle={`${memory.eyebrow} · ${memory.subtitle}`} height={172} />
              <View style={styles.memoryAction}><Button label={`Open ${memory.title}`} tone="secondary" onPress={() => onOpenEvent?.(memory.eventId)} /></View>
            </View>
          ))}
        </View> : null}
      </ScrollView>
    </View>
  );
}

function ScreenState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return <View accessibilityLiveRegion="polite" style={styles.state}><SurfaceCard><Text role="heading" {...{ 'aria-level': 1 }} style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{detail}</Text>{onRetry ? <Button label="Retry" tone="secondary" onPress={onRetry} /> : null}</SurfaceCard></View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 40,
  },
  eyebrow: {
    marginTop: 18,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: palette.text,
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 10,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 12,
    marginBottom: 8,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  flexCopy: { flex: 1, minWidth: 0 },
  errorCopy: { color: palette.coral, fontSize: 14, lineHeight: 20 },
  updateItem: { borderColor: palette.inkSoft, borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 },
  updateUnread: { backgroundColor: 'rgba(247,211,200,0.18)', borderColor: palette.coral },
  updateTime: { color: palette.muted, fontSize: 12, marginTop: 5 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: palette.inkSoft,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  activityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  upcomingList: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingCopy: {
    flex: 1,
  },
  memoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memoryTile: {
    flex: 1,
    flexBasis: 240,
  },
  memoryAction: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});
