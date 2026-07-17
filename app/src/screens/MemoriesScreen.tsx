import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectMemoriesViewModel } from '../app/selectors';
import { useActiveGroupHistoryQuery } from '../app/queries';
import { accentForId, accentOf, fonts, palette, radii, spacing, tabBarInset } from '../theme/tokens';

export function MemoriesScreen({ onOpenEvent }: { onOpenEvent?: (eventId: string) => void }) {
  const historyQuery = useActiveGroupHistoryQuery();

  if (historyQuery.isPending) return <MemoryState title="Loading family memories" detail="Gathering photos and comments from completed events…" />;
  if (historyQuery.isError) return <MemoryState title="We couldn’t load family memories" detail={historyQuery.error instanceof Error ? historyQuery.error.message : 'Try again in a moment.'} onRetry={() => historyQuery.refetch()} />;

  const memories = selectMemoriesViewModel(historyQuery.data ?? []);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Family memories</Text>
      <Text style={styles.subtitle}>Completed plans stay connected to the photos and conversation your family shared.</Text>
      {memories.length === 0 ? <SurfaceCard><Text style={styles.cardTitle}>No completed events yet</Text><Text style={styles.cardCopy}>Memories will appear after a family event ends.</Text></SurfaceCard> : null}
      {memories.map((memory) => (
        <Pressable
          key={memory.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${memory.title}`}
          onPress={() => onOpenEvent?.(memory.id)}
          style={({ pressed }) => [pressed && styles.cardPressed]}
        >
          <SurfaceCard>
            <View style={styles.cover}>
              {memory.coverUri ? (
                <Image source={{ uri: memory.coverUri }} style={styles.coverFill} contentFit="cover" />
              ) : (
                <LinearGradient colors={accentOf(accentForId(memory.id)).cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverFill} />
              )}
            </View>
            <Text style={styles.cardTitle}>{memory.title}</Text>
            <Text style={styles.cardCopy}>{memory.detail}</Text>
            <Text style={styles.cardMeta}>{memory.photoCount} {memory.photoCount === 1 ? 'photo' : 'photos'} · {memory.commentCount} {memory.commentCount === 1 ? 'comment' : 'comments'}</Text>
          </SurfaceCard>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function MemoryState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 1 }} style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCopy}>{detail}</Text>
        {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryCta}><Text style={styles.retryCtaText}>Retry</Text></Pressable> : null}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: tabBarInset,
  },
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  title: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  subtitle: { color: palette.muted, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, marginTop: 6, marginBottom: 4 },
  cardPressed: { transform: [{ scale: 0.995 }], opacity: 0.96 },
  cover: { height: 160, borderRadius: radii.md, overflow: 'hidden', backgroundColor: palette.well },
  coverFill: { height: '100%', width: '100%' },
  cardTitle: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: -0.3,
  },
  cardCopy: {
    color: palette.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  cardMeta: {
    color: palette.faint,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  retryCta: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: palette.plum, borderRadius: radii.md, minHeight: 46, justifyContent: 'center', paddingHorizontal: 18 },
  retryCtaText: { color: palette.white, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },
});
