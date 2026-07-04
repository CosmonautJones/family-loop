import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { PhotoCard } from '../components/PhotoCard';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectMemoriesViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function MemoriesScreen() {
  const memoriesRecap = selectMemoriesViewModel();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PhotoCard
        uri={memoriesRecap.coverUri}
        title={memoriesRecap.title}
        subtitle={`${memoriesRecap.resurfacedLabel} · ${memoriesRecap.ingredients}`}
        height={320}
      />

      <SurfaceCard>
        <Text style={styles.cardTitle}>Recap ingredients</Text>
        <Text style={styles.cardCopy}>{memoriesRecap.ingredients}</Text>
        <View style={styles.actionRow}>
          <Button label="View recap" />
          <Button label="Share to group" tone="secondary" />
        </View>
        <View style={styles.galleryRow}>
          <Image source={{ uri: memoriesRecap.photoUris[0] }} style={[styles.galleryTall, styles.galleryBase]} contentFit="cover" transition={300} />
          <View style={styles.galleryColumn}>
            <Image source={{ uri: memoriesRecap.photoUris[1] }} style={styles.galleryBase} contentFit="cover" transition={300} />
            <Image source={{ uri: memoriesRecap.photoUris[2] }} style={styles.galleryBase} contentFit="cover" transition={300} />
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
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
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: palette.peach,
  },
  galleryTall: {
    minHeight: 212,
    flex: 1.2,
  },
});
