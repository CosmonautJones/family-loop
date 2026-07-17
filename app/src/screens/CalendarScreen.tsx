import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventRow } from '../components/EventRow';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectCalendarViewModel } from '../app/selectors';
import { useActiveEventsQuery } from '../app/queries';
import { accentForId, accentOf, fonts, palette, radii, spacing, tabBarInset } from '../theme/tokens';

export function CalendarScreen({ onOpenEvent, onCreateEvent }: { onOpenEvent?: (eventId: string) => void; onCreateEvent?: () => void }) {
  const eventsQuery = useActiveEventsQuery();
  const events = eventsQuery.data ?? [];
  const viewModel = selectCalendarViewModel(events);

  if (eventsQuery.isPending) return <CalendarState title="Loading the calendar" detail="Gathering this group’s plans…" />;
  if (eventsQuery.isError) return <CalendarState title="We couldn’t load the calendar" detail={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Try again in a moment.'} />;

  // Same "current month" window the selector uses, re-derived here so the grid
  // can tint each day's dot with its event's accent and mark today.
  const now = new Date();
  const upcomingSorted = events
    .filter((event) => new Date(event.endsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const monthDate = upcomingSorted[0] ? new Date(upcomingSorted[0].startsAt) : now;
  const isCurrentMonth = now.getMonth() === monthDate.getMonth() && now.getFullYear() === monthDate.getFullYear();
  const today = now.getDate();
  const eventIdByDay = new Map<number, string>();
  upcomingSorted
    .filter((event) => new Date(event.startsAt).getMonth() === monthDate.getMonth() && new Date(event.startsAt).getFullYear() === monthDate.getFullYear())
    .forEach((event) => {
      const day = new Date(event.startsAt).getDate();
      if (!eventIdByDay.has(day)) eventIdByDay.set(day, event.id);
    });
  const eventsById = new Map(events.map((event) => [event.id, event]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Calendar</Text>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Review upcoming family plans.</Text>
      <Text style={styles.subtitle}>{viewModel.calendarSummary}</Text>

      <SurfaceCard>
        <View>
          <Text style={styles.cardTitle}>{viewModel.month}</Text>
          <Text style={styles.cardCopy}>Days with a plan are marked with a dot.</Text>
        </View>

        <View style={styles.grid}>
          {viewModel.calendarEvents.map((item) => {
            const isToday = isCurrentMonth && item.day === today;
            const eventId = eventIdByDay.get(item.day);
            const dotColor = accentOf(eventId ? accentForId(eventId) : undefined).dot;
            return (
              <View key={item.day} style={styles.day}>
                <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{item.day}</Text>
                </View>
                <View style={[styles.dot, item.highlight && { backgroundColor: dotColor }]} />
              </View>
            );
          })}
        </View>
      </SurfaceCard>

      {viewModel.agenda.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming agenda</Text>
          <View style={styles.rows}>
            {viewModel.agenda.map((item) => {
              const source = eventsById.get(item.id);
              const start = source ? new Date(source.startsAt) : now;
              return (
                <EventRow
                  key={item.id}
                  title={item.title}
                  meta={item.detail}
                  day={start.getDate()}
                  month={start.toLocaleDateString('en-US', { month: 'short' })}
                  accent={accentForId(item.id)}
                  onPress={() => onOpenEvent?.(item.id)}
                />
              );
            })}
          </View>
        </View>
      ) : (
        <SurfaceCard>
          <Text style={styles.cardTitle}>No upcoming events planned</Text>
          <Text style={styles.cardCopy}>Create an event to put a new plan on this group’s calendar.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Create event" onPress={onCreateEvent} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>Create event</Text>
          </Pressable>
        </SurfaceCard>
      )}
    </ScrollView>
  );
}

function CalendarState({ title, detail }: { title: string; detail: string }) {
  return <View accessibilityLiveRegion="polite" style={styles.state}><SurfaceCard><Text role="heading" {...{ 'aria-level': 1 }} style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{detail}</Text></SurfaceCard></View>;
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: tabBarInset,
  },
  eyebrow: {
    marginTop: 18,
    color: palette.berry,
    fontFamily: fonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11.5,
  },
  title: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginTop: 10,
  },
  subtitle: {
    color: palette.muted,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 8,
  },
  cardTitle: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  cardCopy: {
    color: palette.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  grid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    backgroundColor: palette.plum,
  },
  dayNumber: {
    color: palette.text,
    fontFamily: fonts.medium,
    fontWeight: '500',
    fontSize: 13,
  },
  dayNumberToday: {
    color: palette.white,
    fontFamily: fonts.semibold,
    fontWeight: '600',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.pill,
    marginTop: 5,
    backgroundColor: 'transparent',
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  rows: { gap: 10 },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: palette.plum,
    borderRadius: radii.md,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyCtaText: {
    color: palette.white,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    fontSize: 15,
  },
});
