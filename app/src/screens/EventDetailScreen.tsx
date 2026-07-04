import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectEventDetailViewModel } from '../app/selectors';
import { palette, spacing } from '../theme/tokens';

export function EventDetailScreen() {
  const eventDetail = selectEventDetailViewModel();
  const eventThread = eventDetail.thread;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>{eventDetail.timeLabel}</Text>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{eventDetail.title}</Text>
            <Text style={styles.heroCopy}>{eventDetail.description}</Text>
          </View>
          <Chip label={eventDetail.rsvpSummary} tone="sage" />
        </View>
        <View style={styles.actionRow}>
          <Button label="Going" />
          <Button label="Chat" tone="secondary" />
          <Button label="Add photo" tone="ghost" />
        </View>
      </View>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Event pulse</Text>
        <View style={styles.journey}>
          {eventDetail.sections.map((section, index) => (
            <View key={section.title} style={styles.journeyRow}>
              <View style={styles.step}><Text style={styles.stepText}>{index + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{section.title}</Text>
                <Text style={styles.cardCopy}>{section.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Thread</Text>
        <View style={styles.thread}>
          {eventThread.map((item) => (
            <View key={item.body} style={[styles.bubble, item.self && styles.selfBubble]}>
              <Text style={[styles.bubbleText, item.self && styles.selfBubbleText]}>{item.body}</Text>
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
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
    marginTop: 8,
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
    marginTop: 4,
  },
  journey: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  journeyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(113,54,93,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: palette.plum,
    fontWeight: '800',
    fontSize: 13,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  thread: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    padding: 13,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(32,22,28,0.08)',
  },
  selfBubble: {
    alignSelf: 'flex-end',
    backgroundColor: palette.plum,
    borderColor: palette.plum,
  },
  bubbleText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  selfBubbleText: {
    color: '#fff',
  },
});
