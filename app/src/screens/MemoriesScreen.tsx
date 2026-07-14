import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { PhotoCard } from '../components/PhotoCard';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectMemoriesViewModel } from '../app/selectors';
import { useActiveGroupHistoryQuery } from '../app/queries';
import { palette, spacing } from '../theme/tokens';

export function MemoriesScreen({ onOpenEvent }: { onOpenEvent?: (eventId: string) => void }) {
  const historyQuery = useActiveGroupHistoryQuery();

  if (historyQuery.isPending) return <MemoryState title="Loading family memories" detail="Gathering photos and comments from completed events…" />;
  if (historyQuery.isError) return <MemoryState title="We couldn’t load family memories" detail={historyQuery.error instanceof Error ? historyQuery.error.message : 'Try again in a moment.'} onRetry={() => historyQuery.refetch()} />;

  const memories = selectMemoriesViewModel(historyQuery.data ?? []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Family memories</Text>
      <Text style={styles.cardCopy}>Completed plans stay connected to the photos and conversation your family shared.</Text>
      {memories.length === 0 ? <SurfaceCard><Text style={styles.cardTitle}>No completed events yet</Text><Text style={styles.cardCopy}>Memories will appear after a family event ends.</Text></SurfaceCard> : null}
      {memories.map((memory) => (
        <SurfaceCard key={memory.id}>
          {memory.coverUri ? <PhotoCard uri={memory.coverUri} title={memory.title} subtitle={memory.detail} height={220} /> : null}
          <Text style={styles.cardTitle}>{memory.title}</Text>
          <Text style={styles.cardCopy}>{memory.detail}</Text>
          <Text style={styles.cardCopy}>{memory.photoCount} {memory.photoCount === 1 ? 'photo' : 'photos'} · {memory.commentCount} {memory.commentCount === 1 ? 'comment' : 'comments'}</Text>
          <View style={styles.actionRow}><Button label="Open event" onPress={() => onOpenEvent?.(memory.id)} /></View>
        </SurfaceCard>
      ))}
    </ScrollView>
  );
}

function MemoryState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return <View style={styles.state}><SurfaceCard><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{detail}</Text>{onRetry ? <View style={styles.actionRow}><Button label="Retry" onPress={onRetry} /></View> : null}</SurfaceCard></View>;
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 40,
  },
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  title: { color: palette.text, fontSize: 32, lineHeight: 36, fontWeight: '900' },
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
});
