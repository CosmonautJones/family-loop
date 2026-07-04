import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

const palette = {
  bg: '#FBF9F8',
  surface: '#FFFFFF',
  text: '#20161C',
  muted: '#6D6370',
  plum: '#71365D',
  coral: '#F06F67',
  sage: '#AAC5B1',
  sky: '#C6D9F6',
};

function Chip({ label, tone = 'sage' }: { label: string; tone?: 'sage' | 'sky' | 'coral' }) {
  const tones = {
    sage: { backgroundColor: 'rgba(170,197,177,0.28)', color: '#355442' },
    sky: { backgroundColor: 'rgba(198,217,246,0.42)', color: '#35527C' },
    coral: { backgroundColor: 'rgba(240,111,103,0.18)', color: '#9C3E44' },
  } as const;

  return (
    <View style={[styles.chip, { backgroundColor: tones[tone].backgroundColor }]}>
      <Text style={[styles.chipText, { color: tones[tone].color }]}>{label}</Text>
    </View>
  );
}

export default function App() {
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
          <Text style={styles.heroMini}>Next up · Today 6:30 PM</Text>
          <Text style={styles.heroTitle}>Lake Picnic with Family</Text>
          <Text style={styles.heroCopy}>
            One event page for reminders, chat, and the shared album after sunset.
          </Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open event</Text></Pressable>
            <Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Add reminder</Text></Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>This week</Text>
              <Text style={styles.cardCopy}>4 events · 2 reminders · 1 recap ready</Text>
            </View>
            <Chip label="Agenda" tone="sky" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Recent activity</Text>
              <Text style={styles.cardCopy}>The event stays at the center of the conversation.</Text>
            </View>
            <Chip label="Memories" />
          </View>
          <View style={styles.divider} />
          <View style={styles.listItem}>
            <View>
              <Text style={styles.listTitle}>Emma added 12 photos</Text>
              <Text style={styles.cardCopy}>Zoo day recap is ready</Text>
            </View>
            <Chip label="Recap" tone="coral" />
          </View>
          <View style={styles.listItem}>
            <View>
              <Text style={styles.listTitle}>Dinner moved to 7:30</Text>
              <Text style={styles.cardCopy}>Everyone sees the update in context</Text>
            </View>
            <Chip label="Updated" tone="sky" />
          </View>
        </View>

        <View style={styles.memoryRow}>
          <View style={[styles.memoryCard, { backgroundColor: palette.coral }]}>
            <Text style={styles.memoryMini}>On this day</Text>
            <Text style={styles.memoryTitle}>Summer fireworks recap</Text>
          </View>
          <View style={[styles.memoryCard, { backgroundColor: palette.sage }]}>
            <Text style={[styles.memoryMini, { color: '#234132' }]}>Coming soon</Text>
            <Text style={[styles.memoryTitle, { color: '#234132' }]}>Friday dinner club</Text>
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
    padding: 22,
    gap: 16,
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
    padding: 22,
    gap: 12,
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
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: palette.plum,
    fontWeight: '800',
  },
  secondaryButton: {
    borderColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
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
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
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
