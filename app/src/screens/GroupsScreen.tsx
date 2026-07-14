import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useActiveEventsQuery, useActiveGroupMembersQuery, useActiveGroupQuery, useCreateGroupInvitationMutation, useGroupInvitationsQuery, useLeaveGroupMutation, useRemoveGroupMemberMutation, useRevokeGroupInvitationMutation, useTransferGroupOwnershipMutation } from '../app/queries';
import { selectFamilyViewModel } from '../app/selectors';
import { Button } from '../components/Button';
import { SurfaceCard } from '../components/SurfaceCard';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { palette, spacing } from '../theme/tokens';

function confirmAction(title: string, detail: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return Promise.resolve(window.confirm(`${title}\n\n${detail}`));
  return new Promise<boolean>((resolve) => Alert.alert(title, detail, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Continue', style: 'destructive', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}

function createInvitationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function GroupsScreen() {
  const { width } = useWindowDimensions();
  const auth = useAuthSession();
  const groupQuery = useActiveGroupQuery();
  const membersQuery = useActiveGroupMembersQuery();
  const eventsQuery = useActiveEventsQuery();
  const groupId = groupQuery.data?.id ?? '';
  const currentMember = membersQuery.data?.find((member) => member.id === auth.session?.userId);
  const owner = currentMember?.role === 'owner';
  const invitations = useGroupInvitationsQuery(groupId, owner);
  const createInvitation = useCreateGroupInvitationMutation(groupId);
  const revokeInvitation = useRevokeGroupInvitationMutation(groupId);
  const removeMember = useRemoveGroupMemberMutation(groupId);
  const leaveGroup = useLeaveGroupMutation(groupId);
  const transferOwnership = useTransferGroupOwnershipMutation(groupId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const loading = groupQuery.isPending || membersQuery.isPending || eventsQuery.isPending;
  const error = groupQuery.error ?? membersQuery.error ?? eventsQuery.error;
  const retry = () => Promise.all([groupQuery.refetch(), membersQuery.refetch(), eventsQuery.refetch()]);

  if (loading) return <View style={styles.state} accessibilityLiveRegion="polite"><ActivityIndicator color={palette.plum} /><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>Loading your family…</Text></View>;
  if (error) return <View style={styles.state} accessibilityLiveRegion="polite"><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>We couldn't load your family.</Text><Text style={styles.cardCopy}>{error instanceof Error ? error.message : 'Please try again.'}</Text><Button label="Try again" onPress={retry} /></View>;
  if (!groupQuery.data) return <View style={styles.state}><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>No active family yet.</Text><Text style={styles.cardCopy}>Create or join a family to manage people and invitations.</Text></View>;

  const family = selectFamilyViewModel(groupQuery.data, membersQuery.data ?? [], eventsQuery.data ?? []);
  const act = async (action: () => Promise<unknown>, success: string) => { setNotice(null); try { await action(); setNotice(success); } catch { setNotice('That family action isn’t available. Try again.'); } };
  const invite = async () => {
    if (!inviteEmail.trim()) { setNotice('Enter the email address your relative will use.'); return; }
    const token = createInvitationToken();
    await act(async () => {
      await createInvitation.mutateAsync({ email: inviteEmail.trim(), token });
      const base = typeof window === 'undefined' ? 'https://loopedin.app/' : `${window.location.origin}${window.location.pathname}`;
      setInviteLink(`${base}#/invite/${token}`); setInviteEmail('');
    }, 'Invitation created. Share the private link below with the invited person.');
  };

  return <ScrollView contentContainerStyle={[styles.container, { width: Math.max(width - (2 * spacing.lg), 0) }]}>
    <Text style={styles.eyebrow}>Your family</Text><Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>{family.name}</Text><Text style={styles.subtitle}>{family.description}</Text>
    {notice ? <Text accessibilityLiveRegion="polite" style={notice.includes('isn’t') ? styles.error : styles.notice}>{notice}</Text> : null}
    <SurfaceCard><Text style={styles.cardTitle}>Family at a glance</Text><Text style={styles.summary}>{family.memberCountLabel}</Text><Text style={styles.cardCopy}>{family.upcomingLabel}</Text></SurfaceCard>
    {owner ? <SurfaceCard>
      <Text style={styles.cardTitle}>Invite someone</Text><Text style={styles.cardCopy}>The link is private and tied to this email. LoopedIn does not send it for you yet.</Text>
      <Text style={styles.label}>Email address</Text><TextInput accessibilityLabel="Invite email address" autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={setInviteEmail} placeholder="relative@example.com" style={styles.input} value={inviteEmail} />
      <Button label={createInvitation.isPending ? 'Creating invitation…' : 'Create invitation link'} disabled={createInvitation.isPending} onPress={invite} />
      {inviteLink ? <View style={styles.linkBox}><Text selectable style={styles.link}>{inviteLink}</Text><Button label="Copy invitation link" tone="secondary" onPress={async () => { if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(inviteLink); setNotice('Invitation link copied.'); } else setNotice('Select and copy the invitation link above.'); }} /></View> : null}
      <Text style={styles.sectionTitle}>Pending invitations</Text>
      {invitations.isPending ? <ActivityIndicator color={palette.plum} /> : null}
      {invitations.isError ? <><Text style={styles.error}>Pending invitations are unavailable.</Text><Button label="Retry invitations" tone="secondary" onPress={() => invitations.refetch()} /></> : null}
      {invitations.isSuccess && invitations.data.filter((item) => item.status === 'pending').length === 0 ? <Text style={styles.cardCopy}>No invitations are waiting.</Text> : null}
      {invitations.data?.filter((item) => item.status === 'pending').map((item) => <View key={item.id} style={styles.actionRow}><View style={styles.rowCopy}><Text style={styles.memberName}>{item.email}</Text><Text style={styles.role}>Pending</Text></View><Button label={`Revoke invitation for ${item.email}`} tone="secondary" disabled={revokeInvitation.isPending} onPress={() => act(() => revokeInvitation.mutateAsync(item.id), 'Invitation revoked.')} /></View>)}
    </SurfaceCard> : null}
    <SurfaceCard><Text style={styles.cardTitle}>People</Text><View style={styles.list}>{family.members.map((member) => <View key={member.id} style={styles.memberBlock}>
      <View style={styles.memberRow} accessibilityLabel={`${member.name}, ${member.role}`}><View accessible={false} style={styles.avatar}><Text style={styles.avatarText}>{member.initials}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.role}>{member.role}</Text></View></View>
      {owner && member.id !== auth.session?.userId ? <View style={styles.memberActions}><Button label={`Transfer ownership to ${member.name}`} tone="secondary" disabled={transferOwnership.isPending} onPress={async () => { if (await confirmAction('Transfer family ownership?', `${member.name} will control invitations and members. You will become a member.`)) await act(() => transferOwnership.mutateAsync(member.id), 'Ownership transferred.'); }} /><Button label={`Remove ${member.name}`} tone="secondary" disabled={removeMember.isPending} onPress={async () => { if (await confirmAction(`Remove ${member.name}?`, 'They will immediately lose access to this family’s plans, comments, and photos.')) await act(() => removeMember.mutateAsync(member.id), `${member.name} removed.`); }} /></View> : null}
    </View>)}</View></SurfaceCard>
    {!owner ? <SurfaceCard><Text style={styles.cardTitle}>Leave family</Text><Text style={styles.cardCopy}>Leaving removes your access to this family’s plans, comments, and photos.</Text><Button label={leaveGroup.isPending ? 'Leaving family…' : 'Leave family'} tone="secondary" disabled={leaveGroup.isPending} onPress={async () => { if (await confirmAction(`Leave ${family.name}?`, 'You will lose access immediately. You’ll need a new invitation to return.')) await act(() => leaveGroup.mutateAsync(), 'You left the family.'); }} /></SurfaceCard> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', boxSizing: 'border-box', gap: spacing.md, maxWidth: 680, minWidth: 0, padding: spacing.lg, paddingBottom: 40 }, state: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', minHeight: 320, padding: spacing.lg }, stateTitle: { color: palette.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginTop: 18, textTransform: 'uppercase' }, title: { color: palette.text, flexShrink: 1, fontSize: 32, fontWeight: '800', lineHeight: 38, maxWidth: '100%' }, subtitle: { color: palette.muted, flexShrink: 1, fontSize: 16, lineHeight: 24, maxWidth: '100%' },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '800' }, sectionTitle: { color: palette.text, fontSize: 17, fontWeight: '800', marginTop: spacing.sm }, summary: { color: palette.plum, fontSize: 17, fontWeight: '800' }, cardCopy: { color: palette.muted, fontSize: 15, lineHeight: 22 }, label: { color: palette.text, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: palette.white, borderColor: palette.inkSoft, borderRadius: 14, borderWidth: 1, color: palette.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md }, notice: { color: palette.plum, fontSize: 14, lineHeight: 20 }, error: { color: palette.coral, fontSize: 14, lineHeight: 20 },
  linkBox: { gap: spacing.sm }, link: { color: palette.plum, flexShrink: 1, fontSize: 14, lineHeight: 21 }, list: { gap: spacing.md }, memberBlock: { borderBottomColor: palette.inkSoft, borderBottomWidth: 1, gap: spacing.sm, paddingBottom: spacing.md }, memberRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56 }, avatar: { alignItems: 'center', backgroundColor: 'rgba(113,54,93,0.12)', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, avatarText: { color: palette.plum, fontSize: 16, fontWeight: '800' }, memberCopy: { flex: 1 }, memberName: { color: palette.text, flexShrink: 1, fontSize: 17, fontWeight: '800' }, role: { color: palette.muted, fontSize: 14, marginTop: 2 }, memberActions: { gap: spacing.sm }, actionRow: { alignItems: 'stretch', gap: spacing.sm }, rowCopy: { minWidth: 0 },
});
