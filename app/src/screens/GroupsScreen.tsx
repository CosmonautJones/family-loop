import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useActiveEventsQuery, useActiveGroupMembersQuery, useActiveGroupQuery, useCreateGroupInvitationMutation, useEmailGroupInvitationMutation, useGroupInvitationsQuery, useLeaveGroupMutation, useRemoveGroupMemberMutation, useRevokeGroupInvitationMutation, useTransferGroupOwnershipMutation } from '../app/queries';
import { selectFamilyViewModel } from '../app/selectors';
import { Avatar } from '../components/Avatar';
import { StatusChip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { DataExportCard } from '../features/account/DataExportCard';
import { AccountDeletionCard } from '../features/account/AccountDeletionCard';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { canSubmitInvitation, confirmInvitationDraft, invitationDraftForEmail, normalizeInvitationEmail, retainInvitationPresentation, revokeInvitationPresentation, type InvitationDraft, type InvitationPresentation } from '../features/auth/invitationDraft';
import { fonts, palette, radii, spacing, tabBarInset } from '../theme/tokens';

function confirmAction(title: string, detail: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return Promise.resolve(window.confirm(`${title}\n\n${detail}`));
  return new Promise<boolean>((resolve) => Alert.alert(title, detail, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Continue', style: 'destructive', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}

function randomInvitationBytes() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
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
  const emailInvitation = useEmailGroupInvitationMutation();
  const revokeInvitation = useRevokeGroupInvitationMutation(groupId);
  const removeMember = useRemoveGroupMemberMutation(groupId);
  const leaveGroup = useLeaveGroupMutation(groupId);
  const transferOwnership = useTransferGroupOwnershipMutation(groupId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePresentation, setInvitePresentation] = useState<InvitationPresentation | null>(null);
  const [createdInvitationId, setCreatedInvitationId] = useState<string | null>(null);
  const [emailQueued, setEmailQueued] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const inviteDraft = useRef<InvitationDraft | null>(null);
  const inviteInFlight = useRef(false);
  const emailAttempt = useRef<{ invitationId: string; deliveryKey: string } | null>(null);
  const loading = groupQuery.isPending || membersQuery.isPending || eventsQuery.isPending;
  const error = groupQuery.error ?? membersQuery.error ?? eventsQuery.error;
  const retry = () => Promise.all([groupQuery.refetch(), membersQuery.refetch(), eventsQuery.refetch()]);

  if (loading) return <View style={styles.state} accessibilityLiveRegion="polite"><ActivityIndicator color={palette.plum} /><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>Loading your family…</Text></View>;
  if (error) return <View style={styles.state} accessibilityLiveRegion="polite"><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>We couldn’t load your family.</Text><Text style={styles.cardCopy}>{error instanceof Error ? error.message : 'Please try again.'}</Text><CardAction tone="primary" label="Try again" onPress={retry} /></View>;
  if (!groupQuery.data) return <View style={styles.state}><Text role="heading" {...{ 'aria-level': 1 }} style={styles.stateTitle}>No active family yet.</Text><Text style={styles.cardCopy}>Create or join a family to manage people and invitations.</Text></View>;

  const family = selectFamilyViewModel(groupQuery.data, membersQuery.data ?? [], eventsQuery.data ?? []);
  const act = async (action: () => Promise<unknown>, success: string) => { setNotice(null); try { await action(); setNotice({ text: success, tone: 'info' }); } catch { setNotice({ text: 'That family action isn’t available. Try again.', tone: 'error' }); } };
  const invite = async () => {
    const email = normalizeInvitationEmail(inviteEmail);
    if (!email) { setNotice({ text: 'Enter the email address your relative will use.', tone: 'error' }); return; }
    if (!canSubmitInvitation(invitePresentation, email, inviteInFlight.current)) return;
    const draft = invitationDraftForEmail(inviteDraft.current, email, randomInvitationBytes);
    inviteDraft.current = draft;
    inviteInFlight.current = true;
    setNotice(null);
    try {
      const created = await createInvitation.mutateAsync({ email: draft.email, token: draft.token });
      const base = typeof window === 'undefined' ? 'https://loopedin.app/' : `${window.location.origin}${window.location.pathname}`;
      setInvitePresentation(confirmInvitationDraft(draft, base));
      setCreatedInvitationId(created.invitationId);
      setEmailQueued(false);
      emailAttempt.current = null;
      setNotice({ text: 'Invitation created. Share the private link below with the invited person.', tone: 'info' });
    } catch (cause: unknown) {
      setInvitePresentation((current) => retainInvitationPresentation(current));
      setNotice({ text: cause instanceof Error && /already waiting|already pending/i.test(cause.message)
        ? 'An invitation is already pending for this email. Revoke it below, then create a new link.'
        : 'We couldn’t confirm this invitation. Retry to safely reuse the same private link.', tone: 'error' });
    } finally {
      inviteInFlight.current = false;
    }
  };
  const emailCreatedInvitation = async () => {
    const draft = inviteDraft.current;
    if (!draft || !invitePresentation || !createdInvitationId || emailQueued || emailInvitation.isPending) return;
    const attempt = emailAttempt.current?.invitationId === createdInvitationId
      ? emailAttempt.current
      : { invitationId: createdInvitationId, deliveryKey: crypto.randomUUID() };
    emailAttempt.current = attempt;
    setNotice(null);
    try {
      await emailInvitation.mutateAsync({ invitationId: createdInvitationId, token: draft.token, deliveryKey: attempt.deliveryKey });
      setEmailQueued(true);
      setNotice({ text: 'The email provider accepted and queued the invitation. The private link remains available below.', tone: 'info' });
    } catch {
      setNotice({ text: 'We couldn’t queue the email. The private invitation link still works; retry the email or copy the link.', tone: 'error' });
    }
  };

  return <ScrollView contentContainerStyle={[styles.container, { width: Math.max(width - (2 * spacing.lg), 0) }]}>
    <Text style={styles.eyebrow}>Your family</Text><Text role="heading" {...{ 'aria-level': 1 }} style={styles.title}>{family.name}</Text><Text style={styles.subtitle}>{family.description}</Text>
    {notice ? <Text accessibilityLiveRegion={notice.tone === 'error' ? 'assertive' : 'polite'} accessibilityRole={notice.tone === 'error' ? 'alert' : undefined} style={notice.tone === 'error' ? styles.error : styles.notice}>{notice.text}</Text> : null}
    <SurfaceCard><Text style={styles.cardTitle}>Family at a glance</Text><Text style={styles.summary}>{family.memberCountLabel}</Text><Text style={styles.cardCopy}>{family.upcomingLabel}</Text></SurfaceCard>
    {owner ? <SurfaceCard>
      <Text style={styles.cardTitle}>Invite someone</Text><Text style={styles.cardCopy}>Create the private, email-bound link first. Then copy it or explicitly queue an invitation email.</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Email address</Text>
        <TextInput nativeID="family-invite-email-input" accessibilityLabel="Invite email address" autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={(value) => { if (normalizeInvitationEmail(value) !== normalizeInvitationEmail(inviteEmail)) { inviteDraft.current = null; emailAttempt.current = null; setInvitePresentation(null); setCreatedInvitationId(null); setEmailQueued(false); } setInviteEmail(value); }} placeholder="relative@example.com" placeholderTextColor={palette.faint} style={styles.input} value={inviteEmail} />
      </View>
      <CardAction tone="primary" label={createInvitation.isPending ? 'Creating invitation…' : invitePresentation ? 'Invitation link created' : 'Create invitation link'} disabled={!canSubmitInvitation(invitePresentation, inviteEmail, createInvitation.isPending || inviteInFlight.current)} onPress={invite} />
      {(inviteDraft.current || invitePresentation) && !createInvitation.isPending ? <CardAction label="Cancel invitation draft" onPress={() => { inviteDraft.current = null; emailAttempt.current = null; setInvitePresentation(null); setCreatedInvitationId(null); setEmailQueued(false); setNotice({ text: 'Invitation draft cleared.', tone: 'info' }); }} /> : null}
      {invitePresentation ? <View style={styles.well}><Text selectable style={styles.link}>{invitePresentation.link}</Text><View style={styles.wellActions}><CardAction label="Copy invitation link" onPress={async () => { if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(invitePresentation.link); setNotice({ text: 'Invitation link copied.', tone: 'info' }); } else setNotice({ text: 'Select and copy the invitation link above.', tone: 'info' }); }} />{auth.configured && createdInvitationId ? <CardAction label={emailInvitation.isPending ? 'Queueing invitation email…' : emailQueued ? 'Invitation email queued' : 'Email invitation'} disabled={emailInvitation.isPending || emailQueued} onPress={emailCreatedInvitation} /> : null}</View></View> : null}
      <Text style={styles.sectionTitle}>Pending invitations</Text>
      {invitations.isPending ? <ActivityIndicator color={palette.plum} /> : null}
      {invitations.isError ? <><Text style={styles.error}>Pending invitations are unavailable.</Text><CardAction label="Retry invitations" onPress={() => invitations.refetch()} /></> : null}
      {invitations.isSuccess && invitations.data.filter((item) => item.status === 'pending').length === 0 ? <Text style={styles.cardCopy}>No invitations are waiting.</Text> : null}
      {invitations.data?.filter((item) => item.status === 'pending').map((item) => <View key={item.id} style={styles.inviteRow}><View style={styles.inviteCopy}><Text numberOfLines={1} style={styles.memberName}>{item.email}</Text></View><StatusChip status="pending" label="Pending" /><CardAction label="Revoke" accessibilityLabel={`Revoke invitation for ${item.email}`} disabled={revokeInvitation.isPending} onPress={async () => { setNotice(null); try { await revokeInvitation.mutateAsync(item.id); const nextPresentation = revokeInvitationPresentation(invitePresentation, item.email); if (!nextPresentation) { inviteDraft.current = null; emailAttempt.current = null; setCreatedInvitationId(null); setEmailQueued(false); } setInvitePresentation(nextPresentation); setNotice({ text: 'Invitation revoked. Any displayed link for it is no longer usable.', tone: 'info' }); } catch { setNotice({ text: 'That family action isn’t available. Try again.', tone: 'error' }); } }} /></View>)}
    </SurfaceCard> : null}
    <SurfaceCard><Text style={styles.cardTitle}>People</Text><View style={styles.list}>{family.members.map((member, index) => <View key={member.id} style={[styles.memberBlock, index > 0 && styles.memberDivider]}>
      <View style={styles.memberRow} accessibilityLabel={`${member.name}, ${member.role}`}><Avatar initials={member.initials} size={40} /><View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.role}>{member.role}</Text></View></View>
      {owner && member.id !== auth.session?.userId ? <View style={styles.memberActions}><CardAction label="Transfer ownership" accessibilityLabel={`Transfer ownership to ${member.name}`} disabled={transferOwnership.isPending} onPress={async () => { if (await confirmAction('Transfer family ownership?', `${member.name} will control invitations and members. You will become a member.`)) await act(() => transferOwnership.mutateAsync(member.id), 'Ownership transferred.'); }} /><CardAction label="Remove" accessibilityLabel={`Remove ${member.name}`} disabled={removeMember.isPending} onPress={async () => { if (await confirmAction(`Remove ${member.name}?`, 'They will immediately lose access to this family’s plans, comments, and photos.')) await act(() => removeMember.mutateAsync(member.id), `${member.name} removed.`); }} /></View> : null}
    </View>)}</View></SurfaceCard>
    {auth.session ? <DataExportCard session={auth.session} /> : null}
    {auth.configured ? <AccountDeletionCard /> : null}
    {!owner ? <SurfaceCard><Text style={styles.cardTitle}>Leave family</Text><Text style={styles.cardCopy}>Leaving removes your access to this family’s plans, comments, and photos.</Text><CardAction label={leaveGroup.isPending ? 'Leaving family…' : 'Leave family'} disabled={leaveGroup.isPending} onPress={async () => { if (await confirmAction(`Leave ${family.name}?`, 'You will lose access immediately. You’ll need a new invitation to return.')) await act(() => leaveGroup.mutateAsync(), 'You left the family.'); }} /></SurfaceCard> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: auth.pending }} disabled={auth.pending} onPress={auth.logout} style={styles.signOut}><Text style={styles.signOutText}>{auth.pending ? 'Signing out…' : 'Sign out'}</Text></Pressable>
  </ScrollView>;
}

function CardAction({ label, accessibilityLabel, tone = 'text', disabled = false, onPress }: { label: string; accessibilityLabel?: string; tone?: 'primary' | 'text'; disabled?: boolean; onPress?: () => void | Promise<unknown> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[tone === 'primary' ? styles.primaryAction : styles.textAction, disabled && styles.actionDisabled]}><Text style={tone === 'primary' ? styles.primaryActionText : styles.textActionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', boxSizing: 'border-box', gap: spacing.md, maxWidth: 680, minWidth: 0, padding: spacing.lg, paddingBottom: tabBarInset },
  state: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', minHeight: 320, padding: spacing.lg },
  stateTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 20, textAlign: 'center' },

  eyebrow: { marginTop: 18, color: palette.berry, fontFamily: fonts.bold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11.5 },
  title: { color: palette.text, flexShrink: 1, fontFamily: fonts.bold, fontWeight: '700', fontSize: 30, lineHeight: 34, letterSpacing: -0.5, maxWidth: '100%' },
  subtitle: { color: palette.muted, flexShrink: 1, fontFamily: fonts.regular, fontWeight: '400', fontSize: 15, lineHeight: 22, maxWidth: '100%' },

  cardTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 20, letterSpacing: -0.3 },
  sectionTitle: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15, marginTop: spacing.xs },
  summary: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 16 },
  cardCopy: { color: palette.muted, fontFamily: fonts.regular, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  label: { color: palette.muted, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, letterSpacing: 0.1 },

  field: { gap: 6 },
  input: { backgroundColor: palette.well, borderColor: palette.hairline, borderRadius: radii.md, borderWidth: 1, color: palette.text, fontFamily: fonts.regular, fontWeight: '400', fontSize: 16, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 11 },
  notice: { color: palette.plum, fontFamily: fonts.medium, fontWeight: '500', fontSize: 14, lineHeight: 20 },
  error: { color: palette.coral, fontFamily: fonts.medium, fontWeight: '500', fontSize: 14, lineHeight: 20 },

  primaryAction: { alignSelf: 'flex-start', alignItems: 'center', backgroundColor: palette.plum, borderRadius: radii.md, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.md },
  primaryActionText: { color: palette.surface, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },
  textAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  textActionText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },
  actionDisabled: { opacity: 0.55 },

  well: { backgroundColor: palette.well, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  link: { color: palette.plum, flexShrink: 1, fontFamily: fonts.medium, fontWeight: '500', fontSize: 13.5, lineHeight: 20 },
  wellActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  inviteRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, borderTopColor: palette.hairline, borderTopWidth: 1, minHeight: 52, paddingVertical: spacing.xs },
  inviteCopy: { flex: 1, minWidth: 120 },

  list: { gap: spacing.md },
  memberBlock: { gap: spacing.sm, paddingTop: spacing.sm },
  memberDivider: { borderTopColor: palette.hairline, borderTopWidth: 1 },
  memberRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52 },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: palette.text, flexShrink: 1, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15.5, letterSpacing: -0.2 },
  role: { color: palette.muted, fontFamily: fonts.regular, fontWeight: '400', fontSize: 13, marginTop: 2 },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingLeft: 52 },

  signOut: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm },
  signOutText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },
});
