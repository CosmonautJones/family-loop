import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { buildCreateEventFields, summarizeDraftEvent } from '../features/events';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { palette, spacing } from '../theme/tokens';

export function CreateEventScreen() {
  const [draftStatus, setDraftStatus] = useState('Ready to save on this device.');
  const [previewVisible, setPreviewVisible] = useState(false);
  const draftEvent = useLoopedInStore((state) => state.draftEvent);
  const updateDraftEvent = useLoopedInStore((state) => state.updateDraftEvent);
  const resetDraftEvent = useLoopedInStore((state) => state.resetDraftEvent);
  const draftFields = buildCreateEventFields(draftEvent).filter((field) => !['Invitees', 'Cover treatment'].includes(field.label));
  const resetDraft = () => {
    resetDraftEvent();
    setDraftStatus('Draft reset to the starter plan.');
    setPreviewVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Create</Text>
      <Text style={styles.title}>Plan the next event</Text>
      <Text style={styles.subtitle}>
        Capture the four details people need before they can reply.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>Mobile draft</Text>
        <Text style={styles.heroTitle}>{draftEvent.title}</Text>
        <Text style={styles.heroCopy}>{summarizeDraftEvent(draftEvent)}</Text>
        <Text style={styles.statusText}>{draftStatus}</Text>
        <View style={styles.heroActions}>
          <Button label="Save draft" onPress={() => setDraftStatus('Draft saved locally for this group.')} />
          <Button label={previewVisible ? 'Hide preview' : 'Preview invite'} tone="secondary" onPress={() => setPreviewVisible((visible) => !visible)} />
          <Button label="Reset" tone="ghost" onPress={resetDraft} />
        </View>
      </View>

      {previewVisible ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Invite preview</Text>
          <Text style={styles.cardCopy}>{draftEvent.title}</Text>
          <Text style={styles.previewCopy}>{summarizeDraftEvent(draftEvent)}</Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Phone-first details</Text>
            <Text style={styles.cardCopy}>Keep the first pass short enough to finish while standing in the kitchen.</Text>
          </View>
          <Chip label="4 fields" tone="sky" />
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
        <Text style={styles.cardTitle}>One-tap edits</Text>
        <Text style={styles.cardCopy}>Quick changes keep the mobile draft moving without opening a long form.</Text>
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
  statusText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  heroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  cardCopy: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  fieldList: { gap: spacing.sm, marginTop: spacing.md },
  fieldCard: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)', padding: 14 },
  fieldLabel: { color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11, fontWeight: '800' },
  fieldValue: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '800', marginTop: 6 },
  fieldHelper: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  previewCopy: { color: palette.text, fontSize: 15, lineHeight: 22, fontWeight: '800', marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: spacing.md },
  coverNote: { color: palette.text, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
