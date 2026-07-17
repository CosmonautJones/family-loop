import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCreateEventMutation } from '../app/queries';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { validateEventForm, type EventForm, type EventFormErrors, type RequiredEventField } from '../features/events/createEvent';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { eventAccents, fonts, gradients, palette, radii, shadow, spacing, tabBarInset, type EventAccent } from '../theme/tokens';

const fieldLabels: Record<RequiredEventField, string> = {
  title: 'Trip or event name',
  date: 'Start date',
  time: 'Start time',
  location: 'Location',
};

const ACCENT_KEYS = Object.keys(eventAccents) as EventAccent[];

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
  // Events have no accent column yet — this is a visual, local-only choice.
  const [accent, setAccent] = useState<EventAccent>('coral');
  const inputRefs = useRef<Partial<Record<RequiredEventField, TextInput | null>>>({});
  const operationKey = useRef(crypto.randomUUID());
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const createEvent = useCreateEventMutation();
  const auth = useAuthSession();
  const fields = useMemo(() => ([
    { key: 'title' as const, placeholder: 'Door County weekend', inputMode: 'text' as const, autoComplete: 'off' as const },
    { key: 'date' as const, placeholder: 'YYYY-MM-DD', inputMode: 'numeric' as const, autoComplete: 'off' as const },
    { key: 'time' as const, placeholder: 'HH:MM', inputMode: 'numeric' as const, autoComplete: 'off' as const },
    { key: 'location' as const, placeholder: 'City, address, or meeting place', inputMode: 'text' as const, autoComplete: 'street-address' as const },
  ]), []);

  const updateField = (key: keyof EventForm, value: string) => {
    operationKey.current = crypto.randomUUID();
    setForm((current) => ({ ...current, [key]: value }));
    if (key !== 'description') setErrors((current) => ({ ...current, [key]: undefined }));
    if (createEvent.isError) createEvent.reset();
  };

  const submitEvent = async () => {
    if (createEvent.isPending || !activeGroupId) return;
    const nextErrors = validateEventForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = (['title', 'date', 'time', 'location'] as const).find((key) => nextErrors[key]);
      if (firstInvalid) inputRefs.current[firstInvalid]?.focus();
      return;
    }
    const startsAt = new Date(`${form.date}T${form.time}:00`);
    try {
      const event = await createEvent.mutateAsync({
        operationKey: operationKey.current,
        groupId: activeGroupId,
        title: form.title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      setForm(initialForm());
      operationKey.current = crypto.randomUUID();
      onCreated?.(event.id);
    } catch { /* The mutation exposes a retryable error below and keeps every field intact. */ }
  };

  const submitDisabled = createEvent.isPending || !activeGroupId;
  const submitLabel = createEvent.isPending ? 'Saving plan…' : createEvent.isError ? 'Try saving again' : 'Create family plan';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>CREATE</Text>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Plan something together</Text>
      <Text style={styles.subtitle}>Share the essentials now. Your family can sort out the rest on the event page.</Text>

      <View style={styles.formCard}>
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.formTitle}>New family plan</Text>
        <Text style={styles.formCopy}>{auth.session ? `Planning as ${auth.session.displayName}` : 'Saved to this device'}</Text>
        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text nativeID={`${field.key}-label`} style={styles.label}>{fieldLabels[field.key]}</Text>
            <TextInput
              {...(errors[field.key] ? { 'aria-describedby': `${field.key}-error`, 'aria-invalid': true } : { 'aria-invalid': false })}
              ref={(node) => { inputRefs.current[field.key] = node; }}
              nativeID={`create-${field.key}-input`}
              accessibilityLabel={fieldLabels[field.key]}
              accessibilityHint={errors[field.key]}
              accessibilityLabelledBy={`${field.key}-label`}
              autoComplete={field.autoComplete}
              autoCapitalize={field.key === 'date' || field.key === 'time' ? 'none' : 'sentences'}
              inputMode={field.inputMode}
              returnKeyType={field.key === 'location' ? 'done' : 'next'}
              onChangeText={(value) => updateField(field.key, value)}
              placeholder={field.placeholder}
              placeholderTextColor={palette.faint}
              style={[styles.input, errors[field.key] && styles.inputError]}
              value={form[field.key]}
            />
            {errors[field.key] ? <Text nativeID={`${field.key}-error`} accessibilityRole="alert" style={styles.errorText}>{errors[field.key]}</Text> : null}
          </View>
        ))}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            nativeID="create-description-input"
            accessibilityLabel="Notes, optional"
            autoComplete="off"
            multiline
            onChangeText={(value) => updateField('description', value)}
            placeholder="What should everyone know?"
            placeholderTextColor={palette.faint}
            style={[styles.input, styles.notesInput]}
            value={form.description}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Color</Text>
          <View accessibilityRole="radiogroup" style={styles.accentRow}>
            {ACCENT_KEYS.map((key) => {
              const selected = accent === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={`${key} color`}
                  accessibilityState={{ selected }}
                  hitSlop={8}
                  onPress={() => setAccent(key)}
                  style={styles.accentSlot}
                >
                  <View style={[styles.accentRing, selected && styles.accentRingSelected]}>
                    <View style={[styles.accentDot, { backgroundColor: eventAccents[key].dot }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {createEvent.isError ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.submitError}>
            {createEvent.error instanceof Error ? createEvent.error.message : 'We couldn’t save this plan. Your details are still here.'}
          </Text>
        ) : null}
        {!activeGroupId ? <Text accessibilityRole="alert" style={styles.submitError}>Choose a family before creating a plan.</Text> : null}
        <Pressable
          accessibilityLabel={submitLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitDisabled }}
          disabled={createEvent.isPending || !activeGroupId}
          onPress={submitEvent}
          style={({ pressed }) => [styles.submitWrap, submitDisabled && styles.submitDisabled, pressed && styles.submitPressed]}
        >
          <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submit}>
            <Text style={styles.submitText}>{submitLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: '100%', minWidth: 0, padding: spacing.lg, gap: spacing.md, paddingBottom: tabBarInset, boxSizing: 'border-box' },
  eyebrow: { marginTop: 18, color: palette.berry, fontFamily: fonts.bold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11.5 },
  title: { maxWidth: '100%', color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  subtitle: { maxWidth: '100%', color: palette.muted, fontFamily: fonts.regular, fontWeight: '400', fontSize: 15, lineHeight: 22 },
  formCard: { width: '100%', maxWidth: 620, minWidth: 0, alignSelf: 'center', borderRadius: radii.hero, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.hairline, padding: spacing.lg, gap: spacing.md, boxSizing: 'border-box', ...shadow.soft },
  formTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  formCopy: { color: palette.muted, fontFamily: fonts.regular, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  field: { width: '100%', minWidth: 0, gap: 6 },
  label: { color: palette.muted, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, letterSpacing: 0.1 },
  input: { width: '100%', minWidth: 0, minHeight: 48, boxSizing: 'border-box', borderRadius: radii.md, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.well, color: palette.text, fontFamily: fonts.regular, fontWeight: '400', fontSize: 16, lineHeight: 22, paddingHorizontal: 14, paddingVertical: 11 },
  inputError: { borderColor: palette.coral },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  errorText: { color: palette.berry, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  accentRow: { flexDirection: 'row', gap: 4 },
  accentSlot: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  accentRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  accentRingSelected: { borderColor: palette.text },
  accentDot: { width: 26, height: 26, borderRadius: 13 },
  submitError: { borderRadius: radii.md, backgroundColor: palette.well, borderWidth: 1, borderColor: palette.hairline, color: palette.berry, fontFamily: fonts.medium, fontWeight: '500', fontSize: 14, lineHeight: 20, padding: spacing.sm },
  submitWrap: { borderRadius: radii.pill, overflow: 'hidden' },
  submitPressed: { opacity: 0.9 },
  submitDisabled: { opacity: 0.55 },
  submit: { minHeight: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 18 },
  submitText: { color: palette.white, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },
});
