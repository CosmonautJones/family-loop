import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { buildCreateEventFields, summarizeDraftEvent } from '../features/events';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { palette, spacing } from '../theme/tokens';

export function CreateEventScreen() {
  const draftEvent = useLoopedInStore((state) => state.draftEvent);
  const updateDraftEvent = useLoopedInStore((state) => state.updateDraftEvent);
  const resetDraftEvent = useLoopedInStore((state) => state.resetDraftEvent);
  const draftFields = buildCreateEventFields(draftEvent);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Create</Text>
      <Text style={styles.title}>Create event draft</Text>
      <Text style={styles.subtitle}>
        Start a practical event flow with the details people actually need before they reply.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>Draft summary</Text>
        <Text style={styles.heroTitle}>{draftEvent.title}</Text>
        <Text style={styles.heroCopy}>{summarizeDraftEvent(draftEvent)}</Text>
        <View style={styles.heroActions}>
          <Button label="Save draft" />
          <Button label="Share preview" tone="secondary" />
          <Button label="Reset" tone="ghost" onPress={resetDraftEvent} />
        </View>
      </View>

      <SurfaceCard>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Draft fields</Text>
            <Text style={styles.cardCopy}>Each field maps to the shared event model for calendar and detail views.</Text>
          </View>
          <Chip label="Persistent" tone="sky" />
        </View>
        <View style={styles.fieldList}>
          {draftFields.map((field) => (
            <View key={field.label} style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
              <Text style={styles.fieldHelper}>{field.helper}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Fast edits</Text>
        <Text style={styles.cardCopy}>These simulate a real editable flow while persistence and backend wiring mature.</Text>
        <View style={styles.heroActions}>
          <Button label="Make it brunch" onPress={() => updateDraftEvent({ title: 'Sunday brunch after the market' })} />
          <Button label="Move later" tone="secondary" onPress={() => updateDraftEvent({ timeLabel: '6:00 PM' })} />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Invitees</Text>
        <Text style={styles.cardCopy}>Seed the draft with the people who need context first.</Text>
        <View style={styles.chipRow}>
          {draftEvent.invitees.map((invitee) => (
            <Chip key={invitee} label={invitee} tone="sage" />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Cover treatment</Text>
        <Text style={styles.cardCopy}>{draftEvent.coverTreatment}</Text>
        <Text style={styles.coverNote}>
          Use a warm visual treatment now, then swap in a real photo after the event happens.
        </Text>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  eyebrow: { marginTop: 18, color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.8, fontSize: 11, fontWeight: '800' },
  title: { color: palette.text, fontSize: 32, lineHeight: 34, fontWeight: '900', marginTop: 10 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 24, marginTop: 10, marginBottom: 8 },
  heroCard: { backgroundColor: palette.plum, borderRadius: 28, padding: spacing.lg, gap: spacing.sm },
  heroMini: { color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '900' },
  heroCopy: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22 },
  heroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  cardCopy: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  fieldList: { gap: spacing.sm, marginTop: spacing.md },
  fieldCard: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)', padding: 14 },
  fieldLabel: { color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11, fontWeight: '800' },
  fieldValue: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '800', marginTop: 6 },
  fieldHelper: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: spacing.md },
  coverNote: { color: palette.text, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
