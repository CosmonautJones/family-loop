import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { PhotoCard } from '../components/PhotoCard';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectHomeViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function HomeScreen({ onOpenEvent, onCreateEvent }: { onOpenEvent?: (eventId: string) => void; onCreateEvent?: () => void }) {
  const appSections = selectHomeViewModel();
  const heroEvent = appSections.heroEvent;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>What’s next</Text>
        {heroEvent ? (
          <View>
            <Text style={styles.title}>{heroEvent.title}</Text>
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

        {heroEvent ? <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>This week</Text>
              <Text style={styles.cardCopy}>{appSections.weekSummary}</Text>
            </View>
            <Chip label="Agenda" tone="sky" />
          </View>
        </SurfaceCard> : null}

        {appSections.activity.length > 0 ? <SurfaceCard>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Recent activity</Text>
              <Text style={styles.cardCopy}>{appSections.recentActivityTitle}</Text>
            </View>
            <Chip label="Live" tone="coral" />
          </View>
          <View style={styles.divider} />
          {appSections.activity.map((item) => (
            <View key={item.title} style={styles.listItem}>
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

        {appSections.memories.length > 0 ? <View style={styles.memoryRow}>
          {appSections.memories.map((memory) => (
            <View key={memory.title} style={styles.memoryTile}>
              <PhotoCard uri={memory.coverUri} title={memory.title} subtitle={`${memory.eyebrow} · ${memory.subtitle}`} height={172} />
            </View>
          ))}
        </View> : null}
      </ScrollView>
    </View>
  );
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
  memoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  memoryTile: {
    flex: 1,
  },
});
