import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectHomeViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function HomeScreen() {
  const appSections = selectHomeViewModel();
  const heroEvent = appSections.heroEvent;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Loop mobile MVP</Text>
        <Text style={styles.title}>A private social calendar for real life.</Text>
        <Text style={styles.subtitle}>
          This scaffold shows the home dashboard direction for the first Loop mobile build: next event,
          recent activity, shared memories, and fast navigation into event detail.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroMini}>{heroEvent.timeLabel}</Text>
          <Text style={styles.heroTitle}>{heroEvent.title}</Text>
          <Text style={styles.heroCopy}>{heroEvent.description}</Text>
          <View style={styles.heroActions}>
            <Button label="Open event" />
            <Button label="Add reminder" tone="secondary" />
          </View>
        </View>

        <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>This week</Text>
              <Text style={styles.cardCopy}>{appSections.weekSummary}</Text>
            </View>
            <Chip label="Agenda" tone="sky" />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Recent activity</Text>
              <Text style={styles.cardCopy}>{appSections.recentActivityTitle}</Text>
            </View>
            <Chip label="Memories" />
          </View>
          <View style={styles.divider} />
          {appSections.activity.map((item) => (
            <View key={item.title} style={styles.listItem}>
              <View>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.cardCopy}>{item.detail}</Text>
              </View>
              <Chip label={item.badge} tone={item.tone} />
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.memoryRow}>
          <View style={[styles.memoryCard, { backgroundColor: palette.coral }]}>
            <Text style={styles.memoryMini}>{appSections.memories[0].eyebrow}</Text>
            <Text style={styles.memoryTitle}>{appSections.memories[0].title}</Text>
          </View>
          <View style={[styles.memoryCard, { backgroundColor: palette.sage }]}>
            <Text style={[styles.memoryMini, { color: '#234132' }]}>{appSections.memories[1].eyebrow}</Text>
            <Text style={[styles.memoryTitle, { color: '#234132' }]}>{appSections.memories[1].title}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
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
    fontWeight: '800',
  },
  title: {
    color: palette.text,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 12,
    marginBottom: 8,
  },
  heroCard: {
    backgroundColor: palette.plum,
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroMini: {
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '800',
    maxWidth: 240,
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 260,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  rowBetween: {
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(32,22,28,0.08)',
  },
  listItem: {
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
  memoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  memoryCard: {
    flex: 1,
    minHeight: 126,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'flex-end',
  },
  memoryMini: {
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  memoryTitle: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
});
