import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAcceptInvitationMutation, useCanCreateGroupQuery, useCreateGroupMutation, useDeclineInvitationMutation, useInvitationQuery } from '../app/queries';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { DataExportCard } from '../features/account/DataExportCard';
import { AccountDeletionCard } from '../features/account/AccountDeletionCard';
import { palette, spacing } from '../theme/tokens';

export function FamilyOnboardingScreen() {
  const auth = useAuthSession();
  const invitation = useInvitationQuery(auth.invitationToken);
  const entitlement = useCanCreateGroupQuery(!auth.invitationToken);
  const accept = useAcceptInvitationMutation();
  const decline = useDeclineInvitationMutation();
  const create = useCreateGroupMutation();
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const firstField = useRef<TextInput>(null);
  const creationKey = useRef(crypto.randomUUID());

  const finishInvite = async (decision: 'accept' | 'decline') => {
    if (!auth.invitationToken) return;
    setMessage(null);
    try {
      if (decision === 'accept') {
        await accept.mutateAsync(auth.invitationToken);
        setMessage({ text: `You joined ${invitation.data?.status === 'ready' ? invitation.data.groupName : 'the family'}.`, tone: 'info' });
      } else {
        await decline.mutateAsync(auth.invitationToken);
        setMessage({ text: 'Invitation declined.', tone: 'info' });
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      auth.clearInvitationToken();
    } catch {
      const invited = invitation.data?.status === 'ready' ? invitation.data.maskedEmail : 'the invited email';
      setMessage({ text: `We couldn’t add you to this family. This invitation is for ${invited}. If you’re signed in as someone else, sign out and open the link again as that person — otherwise ask for a new invitation.`, tone: 'error' });
    }
  };

  const useInviteCode = () => {
    const value = inviteCode.trim();
    if (!value) { setMessage({ text: 'Paste the invitation code from your family link.', tone: 'error' }); return; }
    const rawToken = value.includes('#/invite/') ? value.split('#/invite/').pop() ?? '' : value;
    const token = rawToken.split(/[/?#]/)[0];
    try { auth.setInvitationToken(token); setMessage(null); }
    catch { setMessage({ text: 'This invitation isn’t available. Paste the complete link or ask for a new one.', tone: 'error' }); }
  };

  if (auth.invitationToken) {
    return <ScrollView contentContainerStyle={styles.container}><SurfaceCard>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Family invitation</Text>
      {invitation.isPending ? <View accessibilityLiveRegion="polite" style={styles.center}><ActivityIndicator color={palette.plum} /><Text style={styles.copy}>Checking your invitation…</Text></View> : null}
      {invitation.data?.status === 'ready' ? <>
        <Text style={styles.familyName}>Join {invitation.data.groupName}?</Text>
        <Text style={styles.copy}>{invitation.data.inviterName} invited {invitation.data.maskedEmail}. Accepting gives this family access to the plans and photos you share with them.</Text>
        <CardAction label={accept.isPending ? 'Joining family…' : 'Accept invitation'} disabled={accept.isPending || decline.isPending} onPress={() => finishInvite('accept')} />
        <CardAction label={decline.isPending ? 'Declining…' : 'Decline invitation'} disabled={accept.isPending || decline.isPending} onPress={() => finishInvite('decline')} />
        {auth.session ? <><Text style={styles.copy}>Signed in as {auth.session.displayName}. This invitation is for {invitation.data.maskedEmail}.</Text><CardAction label="Sign out to join as the invited person" disabled={accept.isPending || decline.isPending} onPress={() => auth.logout()} /></> : null}
      </> : null}
      {invitation.isError || invitation.data?.status === 'unavailable' ? <><Text accessibilityRole="alert" style={styles.error}>This invitation isn’t available. Ask the sender for a new link.</Text><CardAction label="Remove invitation" onPress={auth.clearInvitationToken} /></> : null}
      {message ? <Text accessibilityLiveRegion={message.tone === 'error' ? 'assertive' : 'polite'} accessibilityRole={message.tone === 'error' ? 'alert' : undefined} style={message.tone === 'error' ? styles.error : styles.copy}>{message.text}</Text> : null}
    </SurfaceCard></ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Start with your family</Text>
    <Text style={styles.copy}>Create a private family space or join one using the invitation code you received.</Text>
    <SurfaceCard>
      <Text style={styles.cardTitle}>Join a family</Text><Text style={styles.copy}>Paste the full invitation link or just its code.</Text>
      <Text style={styles.label}>Invitation link or code</Text><TextInput nativeID="family-invitation-code-input" accessibilityLabel="Invitation link or code" autoCapitalize="none" autoComplete="off" autoCorrect={false} onChangeText={setInviteCode} placeholder="Paste invitation" style={styles.input} value={inviteCode} />
      <CardAction label="Check invitation" onPress={useInviteCode} />
    </SurfaceCard>
    {entitlement.isPending ? <SurfaceCard><View accessibilityLiveRegion="polite" style={styles.center}><ActivityIndicator color={palette.plum} /><Text style={styles.copy}>Checking family creation access…</Text></View></SurfaceCard> : null}
    {entitlement.isError ? <SurfaceCard><Text accessibilityRole="alert" style={styles.error}>Family creation access is unavailable right now.</Text><CardAction label="Try again" onPress={() => entitlement.refetch()} /></SurfaceCard> : null}
    {entitlement.data === true ? <SurfaceCard>
      <Text style={styles.cardTitle}>Create a family</Text>
      {!showCreate ? <CardAction label="Create family" onPress={() => { setShowCreate(true); setTimeout(() => firstField.current?.focus(), 0); }} /> : <>
        <Text style={styles.label}>Family name</Text><TextInput ref={firstField} nativeID="family-name-input" accessibilityLabel="Family name" autoComplete="off" onChangeText={setName} placeholder="The Jones family" style={styles.input} value={name} />
        <Text style={styles.label}>Description (optional)</Text><TextInput nativeID="family-description-input" accessibilityLabel="Family description" autoComplete="off" multiline onChangeText={setDescription} placeholder="Trips, plans, and memories" style={[styles.input, styles.multiline]} value={description} />
        <CardAction label={create.isPending ? 'Creating family…' : 'Create family'} disabled={create.isPending || !name.trim()} onPress={async () => {
          setMessage(null);
          try { await create.mutateAsync({ creationKey: creationKey.current, name: name.trim(), description: description.trim(), kind: 'family' }); setMessage({ text: 'Family created.', tone: 'info' }); }
          catch { setMessage({ text: 'We couldn’t create that family. Try again.', tone: 'error' }); }
        }} />
      </>}
    </SurfaceCard> : null}
    {entitlement.data === false ? <SurfaceCard><Text style={styles.cardTitle}>Creation unavailable</Text><Text style={styles.copy}>This account can join a family by invitation, but it can’t create another family.</Text></SurfaceCard> : null}
    {auth.session ? <DataExportCard session={auth.session} /> : null}
    {auth.configured ? <AccountDeletionCard /> : null}
    {message ? <Text accessibilityLiveRegion={message.tone === 'error' ? 'assertive' : 'polite'} accessibilityRole={message.tone === 'error' ? 'alert' : undefined} style={message.tone === 'error' ? styles.error : styles.copy}>{message.text}</Text> : null}
  </ScrollView>;
}

function CardAction({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress?: () => void | Promise<unknown> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.cardAction, disabled && styles.cardActionDisabled]}><Text style={styles.cardActionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', gap: spacing.md, maxWidth: 600, padding: spacing.lg, paddingBottom: 48, width: '100%' },
  title: { color: palette.text, fontSize: 30, fontWeight: '900' }, familyName: { color: palette.text, fontSize: 22, fontWeight: '900' }, cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  copy: { color: palette.muted, fontSize: 15, lineHeight: 22 }, error: { color: palette.berry, fontSize: 15, lineHeight: 22 }, label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.plum, borderRadius: 14, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md }, multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' }, center: { alignItems: 'center', gap: spacing.sm },
  cardAction: { alignItems: 'center', backgroundColor: palette.plum, borderColor: palette.plum, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, cardActionDisabled: { opacity: 0.55 }, cardActionText: { color: palette.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
