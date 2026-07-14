import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SurfaceCard } from '../../components/SurfaceCard';
import { loopedInService } from '../../services';
import { palette, spacing } from '../../theme/tokens';
import type { AuthSession } from '../../services/api';
import { collectCurrentUserData, downloadEncryptedUserDataExport, encryptUserDataExport } from './dataExport';

export function DataExportCard({ session }: { session: AuthSession }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);

  const exportData = async () => {
    if (passphrase.length < 12) { setNotice({ text: 'Use a passphrase with at least 12 characters.', tone: 'error' }); return; }
    if (passphrase !== confirmation) { setNotice({ text: 'The passphrases do not match.', tone: 'error' }); return; }
    setPending(true);
    setNotice(null);
    try {
      const data = await collectCurrentUserData(loopedInService, session);
      const { bundle, manifest } = await encryptUserDataExport(data, passphrase);
      downloadEncryptedUserDataExport(bundle, data.createdAt);
      const missing = manifest.counts.unavailableMediaFiles;
      setPassphrase('');
      setConfirmation('');
      setNotice({ text: missing
        ? `Encrypted export downloaded. ${missing} photo file${missing === 1 ? ' was' : 's were'} unavailable; its metadata is still included. Retry later to try again.`
        : 'Encrypted export downloaded with all of your available photo files.', tone: 'info' });
    } catch {
      setNotice({ text: 'We couldn’t prepare your export. Your passphrase is still here so you can retry.', tone: 'error' });
    } finally {
      setPending(false);
    }
  };

  return <SurfaceCard>
    <Text style={styles.title}>Download your data</Text>
    <Text style={styles.copy}>This encrypted file includes your profile, family memberships, plans you created, and your own RSVPs, comments, photos, and reminder choices. It does not copy other people’s contributions or the whole family archive.</Text>
    <Text style={styles.copy}>Choose a passphrase you can remember. LoopedIn does not save it and cannot recover the file without it.</Text>
    <Text style={styles.label}>Export passphrase</Text>
    <TextInput nativeID="export-passphrase" accessibilityLabel="Export passphrase" autoCapitalize="none" autoComplete="new-password" onChangeText={setPassphrase} secureTextEntry style={styles.input} value={passphrase} />
    <Text style={styles.label}>Confirm passphrase</Text>
    <TextInput nativeID="export-passphrase-confirmation" accessibilityLabel="Confirm export passphrase" autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} secureTextEntry style={styles.input} value={confirmation} />
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: pending }} disabled={pending} onPress={exportData} style={[styles.action, pending && styles.actionDisabled]}><Text style={styles.actionText}>{pending ? 'Preparing encrypted export…' : 'Download encrypted export'}</Text></Pressable>
    {notice ? <Text accessibilityLiveRegion={notice.tone === 'error' ? 'assertive' : 'polite'} accessibilityRole={notice.tone === 'error' ? 'alert' : undefined} style={notice.tone === 'error' ? styles.error : styles.notice}>{notice.text}</Text> : null}
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  title: { color: palette.text, fontSize: 20, fontWeight: '800' }, copy: { color: palette.muted, fontSize: 15, lineHeight: 22 }, label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.plum, borderRadius: 14, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  action: { alignItems: 'center', backgroundColor: palette.plum, borderColor: palette.plum, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, actionDisabled: { opacity: 0.55 }, actionText: { color: palette.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  notice: { color: palette.plum, fontSize: 14, lineHeight: 20 }, error: { color: palette.berry, fontSize: 14, lineHeight: 20 },
});
