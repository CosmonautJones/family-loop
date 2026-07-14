import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCreateEventMutation } from '../app/queries';
import { Button } from '../components/Button';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { validateEventForm, type EventForm, type EventFormErrors, type RequiredEventField } from '../features/events/createEvent';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { palette, spacing } from '../theme/tokens';

const fieldLabels: Record<RequiredEventField, string> = {
  title: 'Trip or event name',
  date: 'Start date',
  time: 'Start time',
  location: 'Location',
};

function initialForm(): EventForm {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return {
    title: '',
    date: `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`,
    time: '10:00',
    location: '',
    description: '',
  };
}

export function CreateEventScreen({ onCreated }: { onCreated?: (eventId: string) => void }) {
  const [form, setForm] = useState<EventForm>(initialForm);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const createEvent = useCreateEventMutation();
  const auth = useAuthSession();
  const fields = useMemo(() => ([
    { key: 'title' as const, placeholder: 'Door County weekend', inputMode: 'text' as const },
    { key: 'date' as const, placeholder: 'YYYY-MM-DD', inputMode: 'numeric' as const },
    { key: 'time' as const, placeholder: 'HH:MM', inputMode: 'numeric' as const },
    { key: 'location' as const, placeholder: 'City, address, or meeting place', inputMode: 'text' as const },
  ]), []);

  const updateField = (key: keyof EventForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key !== 'description') setErrors((current) => ({ ...current, [key]: undefined }));
    if (createEvent.isError) createEvent.reset();
  };

  const submitEvent = async () => {
    if (createEvent.isPending || !activeGroupId) return;
    const nextErrors = validateEventForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const startsAt = new Date(`${form.date}T${form.time}:00`);
    try {
      const event = await createEvent.mutateAsync({
        groupId: activeGroupId,
        title: form.title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      setForm(initialForm());
      onCreated?.(event.id);
    } catch { /* The mutation exposes a retryable error below and keeps every field intact. */ }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>Create</Text>
      <Text style={styles.title}>Plan something together</Text>
      <Text style={styles.subtitle}>Share the essentials now. Your family can sort out the rest on the event page.</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>New family plan</Text>
        <Text style={styles.formCopy}>{auth.session ? `Planning as ${auth.session.displayName}` : 'Saved to this device'}</Text>
        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{fieldLabels[field.key]}</Text>
            <TextInput
              accessibilityLabel={errors[field.key] ? `${fieldLabels[field.key]}, error: ${errors[field.key]}` : fieldLabels[field.key]}
              autoCapitalize={field.key === 'date' || field.key === 'time' ? 'none' : 'sentences'}
              inputMode={field.inputMode}
              onChangeText={(value) => updateField(field.key, value)}
              placeholder={field.placeholder}
              placeholderTextColor={palette.muted}
              style={[styles.input, errors[field.key] && styles.inputError]}
              value={form[field.key]}
            />
            {errors[field.key] ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{errors[field.key]}</Text> : null}
          </View>
        ))}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            accessibilityLabel="Notes, optional"
            multiline
            onChangeText={(value) => updateField('description', value)}
            placeholder="What should everyone know?"
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.notesInput]}
            value={form.description}
          />
        </View>

        {createEvent.isError ? (
          <Text accessibilityLiveRegion="assertive" style={styles.submitError}>
            {createEvent.error instanceof Error ? createEvent.error.message : 'We couldn’t save this plan. Your details are still here.'}
          </Text>
        ) : null}
        {!activeGroupId ? <Text style={styles.submitError}>Choose a family before creating a plan.</Text> : null}
        <Button
          disabled={createEvent.isPending || !activeGroupId}
          label={createEvent.isPending ? 'Saving plan…' : createEvent.isError ? 'Try saving again' : 'Create family plan'}
          onPress={submitEvent}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: '100%', minWidth: 0, padding: spacing.lg, gap: spacing.md, paddingBottom: 40, boxSizing: 'border-box' },
  eyebrow: { marginTop: 18, color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.8, fontSize: 11, fontWeight: '800' },
  title: { maxWidth: '100%', color: palette.text, fontSize: 32, lineHeight: 36, fontWeight: '900' },
  subtitle: { maxWidth: '100%', color: palette.muted, fontSize: 15, lineHeight: 23 },
  formCard: { width: '100%', maxWidth: 620, minWidth: 0, alignSelf: 'center', borderRadius: 28, backgroundColor: palette.plum, padding: spacing.lg, gap: spacing.md, boxSizing: 'border-box' },
  formTitle: { color: '#fff', fontSize: 23, lineHeight: 28, fontWeight: '900' },
  formCopy: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20 },
  field: { width: '100%', minWidth: 0, gap: 6 },
  label: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  input: { width: '100%', minWidth: 0, minHeight: 48, boxSizing: 'border-box', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#fff', color: palette.text, fontSize: 16, lineHeight: 22, paddingHorizontal: 14, paddingVertical: 11 },
  inputError: { borderColor: palette.coral },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  errorText: { color: '#fff', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  submitError: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 14, lineHeight: 20, padding: 12, fontWeight: '700' },
});
