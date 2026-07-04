import { StyleSheet, Text, View } from 'react-native';
import type { AppSectionKey } from '../data/sampleData';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { activityFeed, heroEvent, memoryHighlights, weeklySummary } from '../data/sampleData';
import { palette, radii, spacing, typography } from '../theme/tokens';

export type HomeScreenProps = {
  activeSection: AppSectionKey;
};

export function HomeScreen({ activeSection }: HomeScreenProps) {
  return (
    <>
      <Text style={styles.eyebrow}>Loop mobile MVP</Text>
      <Text style={styles.title}>A private social calendar for real life.</Text>
      <Text style={styles.subtitle}>
        This scaffold shows the home dashboard direction for the first Loop mobile build: next event,
        recent activity, shared memories, and fast navigation into event detail.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>{heroEvent.eyebrow}</Text>
        <Text style={styles.heroTitle}>{heroEvent.title}</Text>
        <Text style={styles.heroCopy}>{heroEvent.copy}</Text>
        <View style={styles.heroActions}>
          <Button label={heroEvent.primaryAction} />
          <Button label={heroEvent.secondaryAction} variant="secondary" />
        </View>
      </View>

      <SurfaceCard title={weeklySummary.title} subtitle={weeklySummary.copy} aside={<Chip label={weeklySummary.badge} tone="sky" />} />

      <SurfaceCard
        title="Recent activity"
        subtitle="The event stays at the center of the conversation."
        aside={<Chip label={activeSection === 'memories' ? 'Memories' : 'Activity'} />}
      >
        <View style={styles.divider} />
        {activityFeed.map((item) => (
          <View key={item.title} style={styles.listItem}>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listBody}>{item.copy}</Text>
            </View>
            <Chip label={item.badge} tone={item.tone} />
          </View>
        ))}
      </SurfaceCard>

      <View style={styles.memoryRow}>
        {memoryHighlights.map((memory) => {
          const isCoral = memory.tone === 'coral';
          return (
            <View
              key={memory.title}
              style={[styles.memoryCard, { backgroundColor: isCoral ? palette.coral : palette.sage }]}
            >
              <Text style={[styles.memoryMini, !isCoral && styles.memoryMiniAlt]}>{memory.eyebrow}</Text>
              <Text style={[styles.memoryTitle, !isCoral && styles.memoryTitleAlt]}>{memory.title}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginTop: spacing.lg,
    color: palette.muted,
    ...typography.eyebrow,
  },
  title: {
    color: palette.text,
    marginTop: 10,
    ...typography.title,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroCard: {
    backgroundColor: palette.plum,
    borderRadius: radii.hero,
    padding: spacing.xl,
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
    color: palette.white,
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
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  memoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  memoryCard: {
    flex: 1,
    minHeight: 126,
    borderRadius: radii.card,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  memoryMini: {
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  memoryMiniAlt: {
    color: '#234132',
  },
  memoryTitle: {
    color: palette.white,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  memoryTitleAlt: {
    color: '#234132',
  },
});
