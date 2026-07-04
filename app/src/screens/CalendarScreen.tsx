import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectCalendarViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function CalendarScreen() {
  const viewModel = selectCalendarViewModel();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Calendar</Text>
      <Text style={styles.title}>See the month, then drill into the moment.</Text>
      <Text style={styles.subtitle}>{viewModel.calendarSummary}</Text>

      <SurfaceCard>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>July rhythm</Text>
            <Text style={styles.cardCopy}>A month view that still feels warm and social.</Text>
          </View>
          <Chip label="7 plans" tone="sky" />
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

      <SurfaceCard>
        <Text style={styles.cardTitle}>Upcoming agenda</Text>
        <View style={styles.list}>
          {viewModel.agenda.map((item) => (
            <View key={item.title} style={styles.listRow}>
              <View>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.cardCopy}>{item.detail}</Text>
              </View>
              <Chip label={item.badge} tone={item.tone} />
            </View>
          ))}
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 40,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(32,22,28,0.08)',
    padding: 10,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
