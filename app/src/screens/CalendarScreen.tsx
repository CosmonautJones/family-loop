import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectCalendarViewModel } from '../app/selectors';
import { useActiveEventsQuery } from '../app/queries';
import { Button } from '../components/Button';
import { palette, spacing } from '../theme/tokens';

export function CalendarScreen({ onOpenEvent, onCreateEvent }: { onOpenEvent?: (eventId: string) => void; onCreateEvent?: () => void }) {
  const eventsQuery = useActiveEventsQuery();
  const viewModel = selectCalendarViewModel(eventsQuery.data ?? []);

  if (eventsQuery.isPending) return <CalendarState title="Loading the calendar" detail="Gathering this group’s plans…" />;
  if (eventsQuery.isError) return <CalendarState title="We couldn’t load the calendar" detail={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Try again in a moment.'} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Calendar</Text>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Review upcoming family plans.</Text>
      <Text style={styles.subtitle}>{viewModel.calendarSummary}</Text>

      <SurfaceCard>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>{viewModel.month}</Text>
            <Text style={styles.cardCopy}>Dates with an event are marked with a dot.</Text>
          </View>
          <Chip label={viewModel.calendarSummary} tone="sky" />
        </View>

        <View style={styles.grid}>
          {viewModel.calendarEvents.map((event) => (
            <View key={event.day} style={[styles.day, event.highlight && styles.dayActive]}>
              <Text style={styles.dayNumber}>{event.day}</Text>
              {event.highlight ? <View style={styles.dot} /> : null}
            </View>
          ))}
        </View>
      </SurfaceCard>

      {viewModel.agenda.length > 0 ? <SurfaceCard>
        <Text style={styles.cardTitle}>Upcoming agenda</Text>
        <View style={styles.list}>
          {viewModel.agenda.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => onOpenEvent?.(item.id)}
              style={styles.listRow}
            >
              <View>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.cardCopy}>{item.detail}</Text>
              </View>
              <Chip label={item.badge} tone={item.tone} />
            </Pressable>
          ))}
        </View>
      </SurfaceCard> : <SurfaceCard><Text style={styles.cardTitle}>No upcoming events planned</Text><Text style={styles.cardCopy}>Create an event to put a new plan on this group’s calendar.</Text><Button label="Create event" onPress={onCreateEvent} /></SurfaceCard>}
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
    paddingBottom: 40,
  },
  eyebrow: {
    marginTop: 18,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  grid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  day: {
    width: '12.5%',
    minWidth: 30,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(32,22,28,0.08)',
    padding: 8,
  },
  dayActive: {
    backgroundColor: 'rgba(113,54,93,0.08)',
    borderColor: 'rgba(113,54,93,0.22)',
  },
  dayNumber: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    marginTop: 'auto',
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.coral,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  listRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 6,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
