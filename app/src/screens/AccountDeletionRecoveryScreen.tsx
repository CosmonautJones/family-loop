import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useCancelAccountDeletionMutation } from '../app/queries';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { palette, spacing } from '../theme/tokens';

export function AccountDeletionRecoveryScreen() {
  const auth = useAuthSession();
  const cancelDeletion = useCancelAccountDeletionMutation();
  const [error, setError] = useState<string | null>(null);
  const status = auth.deletionStatus;
  if (!status) return null;

  const cancel = async () => {
    setError(null);
    try { await cancelDeletion.mutateAsync(); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Account recovery is unavailable. Try again.'); }
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Account access is disabled</Text>
    <Text style={styles.copy}>Your family data is no longer available to this account. You can recover access until {new Date(status.purgeAfter).toLocaleDateString()}.</Text>
    <SurfaceCard>
      <Text style={styles.cardTitle}>Changed your mind?</Text>
      <Text style={styles.copy}>Cancel before the deadline to restore access. A legal hold can pause operator deletion, but it does not extend this recovery deadline.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: cancelDeletion.isPending }} disabled={cancelDeletion.isPending} onPress={cancel} style={[styles.action, cancelDeletion.isPending && styles.actionDisabled]}><Text style={styles.actionText}>{cancelDeletion.isPending ? 'Recovering account…' : 'Cancel account deletion'}</Text></Pressable>
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
    </SurfaceCard>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: auth.pending }} disabled={auth.pending} onPress={auth.logout} style={styles.secondary}><Text style={styles.secondaryText}>Sign out</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', gap: spacing.md, maxWidth: 600, padding: spacing.lg, paddingBottom: 48, width: '100%' },
  title: { color: palette.text, fontSize: 30, fontWeight: '900' },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  copy: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  action: { alignItems: 'center', backgroundColor: palette.plum, borderRadius: 14, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionDisabled: { opacity: 0.55 },
  actionText: { color: palette.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  secondaryText: { color: palette.plum, fontSize: 15, fontWeight: '800' },
  error: { color: palette.berry, fontSize: 14, lineHeight: 20 },
});
