import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRequestAccountDeletionMutation } from '../../app/queries';
import { SurfaceCard } from '../../components/SurfaceCard';
import { palette, spacing } from '../../theme/tokens';

export function AccountDeletionCard() {
  const requestDeletion = useRequestAccountDeletionMutation();
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ready = confirmation === 'DELETE' && password.length > 0;

  const submit = async () => {
    if (!ready) return;
    setError(null);
    try {
      await requestDeletion.mutateAsync(password);
      setPassword('');
      setConfirmation('');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Your account was not changed. Try again.');
    }
  };

  return <SurfaceCard>
    <Text style={styles.title}>Delete your account</Text>
    <Text style={styles.copy}>Download your encrypted data first. Confirming disables new access to family plans and private photos immediately and starts a 30-day recoverable grace period.</Text>
    <Text style={styles.copy}>You must transfer ownership of every family first. After the grace period, permanent deletion requires a separate audited operator process; backup copies expire under the documented 30-day backup retention.</Text>
    <Text style={styles.label}>Type DELETE to confirm</Text>
    <TextInput accessibilityLabel="Type DELETE to confirm account deletion" autoCapitalize="characters" autoComplete="off" autoCorrect={false} onChangeText={setConfirmation} style={styles.input} value={confirmation} />
    <Text style={styles.label}>Current password</Text>
    <TextInput accessibilityLabel="Current password for account deletion" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready || requestDeletion.isPending }} disabled={!ready || requestDeletion.isPending} onPress={submit} style={[styles.action, (!ready || requestDeletion.isPending) && styles.actionDisabled]}>
      <Text style={styles.actionText}>{requestDeletion.isPending ? 'Disabling account…' : 'Start account deletion'}</Text>
    </Pressable>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  title: { color: palette.text, fontSize: 20, fontWeight: '800' },
  copy: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.berry, borderRadius: 14, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  action: { alignItems: 'center', backgroundColor: palette.berry, borderColor: palette.berry, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionDisabled: { opacity: 0.55 },
  actionText: { color: palette.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  error: { color: palette.berry, fontSize: 14, lineHeight: 20 },
});
