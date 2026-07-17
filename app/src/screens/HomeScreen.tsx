import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusChip } from '../components/Chip';
import { EventRow } from '../components/EventRow';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectHomeViewModel } from '../app/selectors';
import { useActiveEventsQuery, useActiveGroupHistoryQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery } from '../app/queries';
import { accentForId, accentOf, fonts, palette, radii, spacing, tabBarInset } from '../theme/tokens';

const MONTH = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short' });
const DAY = (iso: string) => new Date(iso).getDate();

export function HomeScreen({ onOpenEvent, onCreateEvent }: { onOpenEvent?: (eventId: string) => void; onCreateEvent?: () => void }) {
  const [visibleUpcomingCount, setVisibleUpcomingCount] = useState(8);
  const eventsQuery = useActiveEventsQuery();
  const historyQuery = useActiveGroupHistoryQuery();
  const notificationsQuery = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const appSections = selectHomeViewModel({ events: eventsQuery.data ?? [], history: historyQuery.data ?? [] });
  const heroEvent = appSections.heroEvent;
  const visibleUpcomingEvents = appSections.upcomingEvents.slice(0, visibleUpcomingCount);
  const eventById = new Map((eventsQuery.data ?? []).map((event) => [event.id, event]));

  if (eventsQuery.isPending) return <ScreenState title="Loading your plans" detail="Finding what’s next for this group…" />;
  if (eventsQuery.isError) return <ScreenState title="We couldn’t load your plans" detail={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Try again in a moment.'} onRetry={() => eventsQuery.refetch()} />;

  const unread = notificationsQuery.data?.filter((item) => !item.read).length ?? 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {heroEvent ? (
          <View>
            <Text style={styles.eyebrow}>UP NEXT</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Up next: ${heroEvent.title}. ${heroEvent.timeLabel}, ${heroEvent.location}`}
              onPress={() => onOpenEvent?.(heroEvent.id)}
              style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
            >
              <View style={styles.heroCover}>
                {heroEvent.coverUri ? (
                  <Image source={{ uri: heroEvent.coverUri }} style={styles.heroCoverFill} contentFit="cover" />
                ) : (
                  <LinearGradient colors={accentOf(accentForId(heroEvent.id)).cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCoverFill} />
                )}
              </View>
              <View style={styles.heroBody}>
                <Text role="heading" {...{ 'aria-level': 1 }} numberOfLines={2} style={styles.heroTitle}>{heroEvent.title}</Text>
                <Text style={styles.heroMeta}>{heroEvent.timeLabel}</Text>
                <Text numberOfLines={1} style={styles.heroWhere}>{heroEvent.location}</Text>
                <View style={styles.heroFooter}>
                  <StatusChip status="pending" label="Tap to RSVP" />
                </View>
              </View>
            </Pressable>
          </View>
        ) : (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptyCopy}>Tap the + to start your family’s first plan — everyone will see it here.</Text>
            <Pressable accessibilityRole="button" onPress={onCreateEvent} style={styles.emptyCta}><Text style={styles.emptyCtaText}>Create event</Text></Pressable>
          </SurfaceCard>
        )}

        {appSections.upcomingEvents.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coming up</Text>
            <View style={styles.rows}>
              {visibleUpcomingEvents.map((event) => {
                const raw = eventById.get(event.id);
                return (
                  <EventRow
                    key={event.id}
                    title={event.title}
                    meta={event.detail}
                    day={raw ? DAY(raw.startsAt) : ''}
                    month={raw ? MONTH(raw.startsAt) : ''}
                    accent={accentForId(event.id)}
                    onPress={() => onOpenEvent?.(event.id)}
                  />
                );
              })}
            </View>
            {visibleUpcomingCount < appSections.upcomingEvents.length ? (
              <Pressable accessibilityRole="button" onPress={() => setVisibleUpcomingCount((count) => count + 12)} style={styles.moreLink}>
                <Text style={styles.moreText}>{`Show ${Math.min(12, appSections.upcomingEvents.length - visibleUpcomingCount)} more plans`}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>In the loop</Text>
            {unread > 0 ? <StatusChip status="pending" label={`${unread} new`} /> : null}
          </View>
          <View style={styles.well}>
            {notificationsQuery.isPending ? <Text accessibilityLiveRegion="polite" style={styles.wellEmpty}>Loading family updates…</Text> : null}
            {notificationsQuery.isError ? <View accessibilityLiveRegion="polite"><Text accessibilityRole="alert" style={styles.errorCopy}>Updates are unavailable right now.</Text></View> : null}
            {notificationsQuery.isSuccess && notificationsQuery.data.length === 0 ? <Text style={styles.wellEmpty}>No updates yet. New comments, photos, and plan changes will appear here.</Text> : null}
            {notificationsQuery.isSuccess ? [...notificationsQuery.data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3).map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.body}`}
                disabled={markRead.isPending}
                onPress={async () => { try { if (!item.read) await markRead.mutateAsync(item.id); } catch { /* Opening the event does not depend on read-state persistence. */ } if (item.eventId) onOpenEvent?.(item.eventId); }}
                style={[styles.loopItem, index > 0 && styles.loopDivider]}
              >
                <View style={styles.loopCopy}>
                  <Text numberOfLines={2} style={[styles.loopTitle, !item.read && styles.loopUnread]}>{item.title}</Text>
                  {item.body ? <Text numberOfLines={1} style={styles.loopDetail}>{item.body}</Text> : null}
                </View>
              </Pressable>
            )) : null}
            {notificationsQuery.isSuccess && notificationsQuery.data.some((item) => !item.read) ? (
              <Pressable accessibilityRole="button" disabled={markAllRead.isPending} onPress={() => markAllRead.mutate()} style={styles.markAll}>
                <Text style={styles.markAllText}>{markAllRead.isPending ? 'Marking updates read…' : 'Mark all read'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ScreenState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 1 }} style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyCopy}>{detail}</Text>
        {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.emptyCta}><Text style={styles.emptyCtaText}>Retry</Text></Pressable> : null}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: tabBarInset },
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  eyebrow: { color: palette.berry, fontFamily: fonts.bold, fontWeight: '700', fontSize: 11.5, letterSpacing: 1.4, marginBottom: 10 },

  hero: { backgroundColor: palette.surface, borderRadius: radii.hero, borderWidth: 1, borderColor: palette.hairline, overflow: 'hidden', ...shadowSoft() },
  heroPressed: { transform: [{ scale: 0.995 }] },
  heroCover: { height: 150, width: '100%', backgroundColor: palette.well },
  heroCoverFill: { height: '100%', width: '100%' },
  heroBody: { padding: 18 },
  heroTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 25, lineHeight: 29, letterSpacing: -0.5 },
  heroMeta: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13.5, marginTop: 8 },
  heroWhere: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13.5, marginTop: 2 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },

  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
  rows: { gap: 10 },
  moreLink: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  moreText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },

  well: { backgroundColor: palette.well, borderRadius: radii.md, padding: spacing.md },
  wellEmpty: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20 },
  errorCopy: { color: palette.berry, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20 },
  loopItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  loopDivider: { borderTopWidth: 1, borderTopColor: palette.hairline },
  loopCopy: { flex: 1, minWidth: 0 },
  loopTitle: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },
  loopUnread: { color: palette.plum },
  loopDetail: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  markAll: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  markAllText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },

  emptyTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 19 },
  emptyCopy: { color: palette.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
  emptyCta: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: palette.plum, borderRadius: radii.md, minHeight: 46, justifyContent: 'center', paddingHorizontal: 18 },
  emptyCtaText: { color: palette.white, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },
});

function shadowSoft() {
  return {
    shadowColor: 'rgba(38,22,28,0.5)',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  } as const;
}
