import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectMemoriesViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function MemoriesScreen() {
  const memoriesRecap = selectMemoriesViewModel();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>{memoriesRecap.resurfacedLabel}</Text>
        <Text style={styles.heroTitle}>{memoriesRecap.title}</Text>
        <Text style={styles.heroCopy}>{memoriesRecap.description}</Text>
        <View style={styles.actionRow}>
          <Button label="View recap" />
          <Button label="Share to group" tone="secondary" />
        </View>
      </View>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Recap ingredients</Text>
        <Text style={styles.cardCopy}>{memoriesRecap.ingredients}</Text>
        <View style={styles.galleryRow}>
          <View style={[styles.galleryTall, styles.galleryBase]} />
          <View style={styles.galleryColumn}>
            <View style={styles.galleryBase} />
            <View style={styles.galleryBase} />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Tagged moments</Text>
        <Text style={styles.cardCopy}>{memoriesRecap.tags}</Text>
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
  heroCard: {
    backgroundColor: palette.coral,
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroMini: {
    color: 'rgba(255,255,255,0.84)',
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
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
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
    marginTop: 8,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  galleryColumn: {
    flex: 1,
    gap: 8,
  },
  galleryBase: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: '#e8d2d4',
  },
  galleryTall: {
    minHeight: 200,
    flex: 1.2,
  },
});
