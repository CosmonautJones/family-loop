import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAcceptInvitationMutation, useCanCreateGroupQuery, useCreateGroupMutation, useDeclineInvitationMutation, useInvitationQuery } from '../app/queries';
import { Button } from '../components/Button';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
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
  const [message, setMessage] = useState<string | null>(null);
  const firstField = useRef<TextInput>(null);
  const creationKey = useRef(crypto.randomUUID());

  const finishInvite = async (decision: 'accept' | 'decline') => {
    if (!auth.invitationToken) return;
    setMessage(null);
    try {
      if (decision === 'accept') {
        await accept.mutateAsync(auth.invitationToken);
        setMessage(`You joined ${invitation.data?.status === 'ready' ? invitation.data.groupName : 'the family'}.`);
      } else {
        await decline.mutateAsync(auth.invitationToken);
        setMessage('Invitation declined.');
      }
      auth.clearInvitationToken();
    } catch {
      setMessage('That family action isn’t available. Ask for a new invitation and try again.');
    }
  };

  const useInviteCode = () => {
    const value = inviteCode.trim();
    if (!value) { setMessage('Paste the invitation code from your family link.'); return; }
    const rawToken = value.includes('#/invite/') ? value.split('#/invite/').pop() ?? '' : value;
    const token = rawToken.split(/[/?#]/)[0];
    try { auth.setInvitationToken(token); setMessage(null); }
    catch { setMessage('This invitation isn’t available. Paste the complete link or ask for a new one.'); }
  };

  if (auth.invitationToken) {
    return <ScrollView contentContainerStyle={styles.container}><SurfaceCard>
      <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Family invitation</Text>
      {invitation.isPending ? <View accessibilityLiveRegion="polite" style={styles.center}><ActivityIndicator color={palette.plum} /><Text style={styles.copy}>Checking your invitation…</Text></View> : null}
      {invitation.data?.status === 'ready' ? <>
        <Text style={styles.familyName}>Join {invitation.data.groupName}?</Text>
        <Text style={styles.copy}>{invitation.data.inviterName} invited {invitation.data.maskedEmail}. Accepting gives this family access to the plans and photos you share with them.</Text>
        <Button label={accept.isPending ? 'Joining family…' : 'Accept invitation'} disabled={accept.isPending || decline.isPending} onPress={() => finishInvite('accept')} />
        <Button label={decline.isPending ? 'Declining…' : 'Decline invitation'} tone="secondary" disabled={accept.isPending || decline.isPending} onPress={() => finishInvite('decline')} />
      </> : null}
      {invitation.isError || invitation.data?.status === 'unavailable' ? <><Text accessibilityRole="alert" style={styles.error}>This invitation isn’t available. Ask the sender for a new link.</Text><Button label="Remove invitation" tone="secondary" onPress={auth.clearInvitationToken} /></> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{message}</Text> : null}
    </SurfaceCard></ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>Start with your family</Text>
    <Text style={styles.copy}>Create a private family space or join one using the invitation code you received.</Text>
    <SurfaceCard>
      <Text style={styles.cardTitle}>Join a family</Text><Text style={styles.copy}>Paste the full invitation link or just its code.</Text>
      <Text style={styles.label}>Invitation link or code</Text><TextInput accessibilityLabel="Invitation link or code" autoCapitalize="none" autoCorrect={false} onChangeText={setInviteCode} placeholder="Paste invitation" style={styles.input} value={inviteCode} />
      <Button label="Check invitation" onPress={useInviteCode} />
    </SurfaceCard>
    {entitlement.isPending ? <SurfaceCard><View accessibilityLiveRegion="polite" style={styles.center}><ActivityIndicator color={palette.plum} /><Text style={styles.copy}>Checking family creation access…</Text></View></SurfaceCard> : null}
    {entitlement.isError ? <SurfaceCard><Text accessibilityRole="alert" style={styles.error}>Family creation access is unavailable right now.</Text><Button label="Try again" tone="secondary" onPress={() => entitlement.refetch()} /></SurfaceCard> : null}
    {entitlement.data === true ? <SurfaceCard>
      <Text style={styles.cardTitle}>Create a family</Text>
      {!showCreate ? <Button label="Create family" onPress={() => { setShowCreate(true); setTimeout(() => firstField.current?.focus(), 0); }} /> : <>
        <Text style={styles.label}>Family name</Text><TextInput ref={firstField} accessibilityLabel="Family name" onChangeText={setName} placeholder="The Jones family" style={styles.input} value={name} />
        <Text style={styles.label}>Description (optional)</Text><TextInput accessibilityLabel="Family description" multiline onChangeText={setDescription} placeholder="Trips, plans, and memories" style={[styles.input, styles.multiline]} value={description} />
        <Button label={create.isPending ? 'Creating family…' : 'Create family'} disabled={create.isPending || !name.trim()} onPress={async () => {
          setMessage(null);
          try { await create.mutateAsync({ creationKey: creationKey.current, name: name.trim(), description: description.trim(), kind: 'family' }); setMessage('Family created.'); }
          catch { setMessage('We couldn’t create that family. Try again.'); }
        }} />
      </>}
    </SurfaceCard> : null}
    {entitlement.data === false ? <SurfaceCard><Text style={styles.cardTitle}>Creation unavailable</Text><Text style={styles.copy}>This account can join a family by invitation, but it can’t create another family.</Text></SurfaceCard> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={message.includes('couldn’t') ? styles.error : styles.copy}>{message}</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', gap: spacing.md, maxWidth: 600, padding: spacing.lg, paddingBottom: 48, width: '100%' },
  title: { color: palette.text, fontSize: 30, fontWeight: '900' }, familyName: { color: palette.text, fontSize: 22, fontWeight: '900' }, cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  copy: { color: palette.muted, fontSize: 15, lineHeight: 22 }, error: { color: palette.coral, fontSize: 15, lineHeight: 22 }, label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.inkSoft, borderRadius: 14, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md }, multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' }, center: { alignItems: 'center', gap: spacing.sm },
});
