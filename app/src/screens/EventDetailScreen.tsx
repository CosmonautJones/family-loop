import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectEventDetailViewModel } from '../app/selectors';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { palette, spacing } from '../theme/tokens';
import type { RSVPStatus } from '../types/domain';
import { useEventMessagesQuery, useEventQuery, useEventRsvpsQuery, useSendMessageMutation, useUpsertRsvpMutation } from '../app/queries';
import { useAuthSession } from '../features/auth/AuthSessionProvider';

const rsvpOptions: RSVPStatus[] = ['going', 'maybe', 'declined'];
const rsvpLabels: Record<RSVPStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  declined: "Can't go",
};
const rsvpNotes: Record<RSVPStatus, string> = {
  going: 'You are counted in. The host can plan around you.',
  maybe: 'You are marked as maybe. The group knows your plan is not final.',
  declined: 'You are marked out. The event stays visible for context and photos.',
};

export function EventDetailScreen({ eventId, backLabel = 'Back', onBack }: { eventId?: string; backLabel?: string; onBack?: () => void }) {
  const eventQuery = useEventQuery(eventId ?? '');
  const rsvpsQuery = useEventRsvpsQuery(eventId ?? '');
  const messagesQuery = useEventMessagesQuery(eventId ?? '');
  const sendMessage = useSendMessageMutation();
  const [messageDraft, setMessageDraft] = useState('');
  const upsertRsvp = useUpsertRsvpMutation();
  const auth = useAuthSession();
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const eventDetail = eventQuery.data?.groupId === activeGroupId ? selectEventDetailViewModel(eventQuery.data, rsvpsQuery.data ?? [], []) : null;
  const identity = auth.session;
  const currentStatus = rsvpsQuery.data?.find((rsvp) => rsvp.personId === identity?.userId)?.status;
  const stagedPhotoCount = useLoopedInStore((state) => state.stagedPhotoCounts[eventId ?? ''] ?? 0);
  const stageEventPhoto = useLoopedInStore((state) => state.stageEventPhoto);
  const reminderDrafted = useLoopedInStore((state) => Boolean(state.reminderDrafts[eventId ?? '']));
  const toggleReminderDraft = useLoopedInStore((state) => state.toggleReminderDraft);

  if (!eventId) return <DetailState title="Event not found" detail="No event was selected." backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isPending || rsvpsQuery.isPending) return <DetailState title="Loading event" detail="Gathering the plan and responses…" backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isError || rsvpsQuery.isError) {
    const error = eventQuery.error ?? rsvpsQuery.error;
    return <DetailState title="We couldn’t load this event" detail={error instanceof Error ? error.message : 'Try again in a moment.'} backLabel={backLabel} onBack={onBack} />;
  }
  if (!eventDetail) return <DetailState title="Event not found" detail="This event may have been removed or is unavailable to this group." backLabel={backLabel} onBack={onBack} />;
  const setRsvpStatus = (status: RSVPStatus) => {
    if (!identity || upsertRsvp.isPending) return;
    upsertRsvp.mutate({ eventId: eventDetail.id, personId: identity.userId, personName: identity.displayName, status });
  };
  const submitMessage = () => {
    const body = messageDraft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate({ eventId: eventDetail.id, body }, { onSuccess: () => setMessageDraft('') });
  };
  const sendDisabled = !messageDraft.trim() || sendMessage.isPending;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {onBack ? <Button label={backLabel} onPress={onBack} /> : null}
      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>{eventDetail.timeLabel}</Text>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{eventDetail.title}</Text>
            <Text style={styles.heroLocation}>{eventDetail.location}</Text>
            <Text style={styles.heroCopy}>{eventDetail.description}</Text>
          </View>
          <Chip label={`${eventDetail.rsvpSummary} / ${currentStatus ? rsvpLabels[currentStatus] : 'No response'}`} tone="sage" />
        </View>
        <View style={styles.actionRow}>
          {rsvpOptions.map((status) => (
            <Button
              key={status}
              label={rsvpLabels[status]}
              tone={status === currentStatus ? 'primary' : 'secondary'}
              disabled={upsertRsvp.isPending}
              onPress={() => setRsvpStatus(status)}
            />
          ))}
          <Button label={stagedPhotoCount > 0 ? 'Stage another' : 'Stage photo'} tone="ghost" onPress={() => stageEventPhoto(eventDetail.id)} />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.responseNote}>{upsertRsvp.isPending ? 'Saving your response…' : currentStatus ? rsvpNotes[currentStatus] : 'Choose a response so your family can plan around you.'}</Text>
        {upsertRsvp.isError ? <Text accessibilityLiveRegion="assertive" style={styles.responseNote}>{upsertRsvp.error instanceof Error ? upsertRsvp.error.message : 'We couldn’t save your response.'}</Text> : null}
      </View>

      <SurfaceCard>
        <View style={styles.galleryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Reminder draft</Text>
            <Text style={styles.cardCopy}>
              {reminderDrafted
                ? 'Morning-of reminder copy is staged for this event. Push delivery is not wired yet.'
                : 'No reminder is staged. Keep timing visible here before push notifications exist.'}
            </Text>
          </View>
          <Chip label={reminderDrafted ? 'Staged' : 'Off'} tone={reminderDrafted ? 'sage' : 'sky'} />
        </View>
        <Button label={reminderDrafted ? 'Clear reminder' : 'Stage reminder'} onPress={() => toggleReminderDraft(eventDetail.id)} />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Event pulse</Text>
        <View style={styles.journey}>
          {eventDetail.sections.map((section, index) => (
            <View key={section.title} style={styles.journeyRow}>
              <View style={styles.step}><Text style={styles.stepText}>{index + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{section.title}</Text>
                <Text style={styles.cardCopy}>{section.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.galleryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Event gallery</Text>
            <Text style={styles.cardCopy}>
              {stagedPhotoCount > 0
                ? `${stagedPhotoCount} photo${stagedPhotoCount === 1 ? '' : 's'} staged locally for the event recap.`
                : 'No photos yet. Stage the first one when the event starts.'}
            </Text>
          </View>
          <Chip label={stagedPhotoCount > 0 ? 'Draft' : 'Empty'} tone={stagedPhotoCount > 0 ? 'coral' : 'sky'} />
        </View>
        {stagedPhotoCount > 0 ? (
          <View style={styles.photoDraft}>
            <Text style={styles.photoDraftIcon}>+</Text>
            <Text style={styles.photoDraftText}>Ready to attach after media upload is wired.</Text>
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Thread</Text>
        {messagesQuery.isPending ? <Text style={styles.cardCopy}>Loading the event conversation…</Text> : null}
        {messagesQuery.isError ? (
          <Text style={styles.threadError}>{messagesQuery.error instanceof Error ? messagesQuery.error.message : 'We couldn’t load this conversation.'}</Text>
        ) : null}
        {messagesQuery.isSuccess && messagesQuery.data.length === 0 ? <Text style={styles.cardCopy}>No messages yet. Start the plan here.</Text> : null}
        {messagesQuery.isSuccess && messagesQuery.data.length > 0 ? (
          <View style={styles.thread}>
            {messagesQuery.data.map((item) => (
              <View key={item.id} style={[styles.bubble, item.self && styles.selfBubble]}>
                <Text style={[styles.bubbleAuthor, item.self && styles.selfBubbleText]}>{item.authorName}</Text>
                <Text style={[styles.bubbleText, item.self && styles.selfBubbleText]}>{item.body}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message"
            multiline
            onChangeText={setMessageDraft}
            placeholder="Add a note for this event"
            placeholderTextColor={palette.muted}
            style={styles.composerInput}
            value={messageDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: sendDisabled }}
            disabled={sendDisabled}
            onPress={submitMessage}
            style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>{sendMessage.isPending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
        {sendMessage.isError ? (
          <Text style={styles.threadError}>{sendMessage.error instanceof Error ? sendMessage.error.message : 'We couldn’t send that message. Your draft is still here.'}</Text>
        ) : null}
      </SurfaceCard>
    </ScrollView>
  );
}

function DetailState({ title, detail, backLabel, onBack }: { title: string; detail: string; backLabel: string; onBack?: () => void }) {
  return <View style={styles.state}>{onBack ? <Button label={backLabel} onPress={onBack} /> : null}<SurfaceCard><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{detail}</Text></SurfaceCard></View>;
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  heroCard: { backgroundColor: palette.plum, borderRadius: 28, padding: spacing.lg, gap: spacing.sm },
  heroMini: { color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11, fontWeight: '700' },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroTitle: { color: '#fff', fontSize: 32, lineHeight: 32, fontWeight: '900' },
  heroLocation: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, marginTop: 6, fontWeight: '800' },
  heroCopy: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  responseNote: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 19 },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  cardCopy: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  journey: { marginTop: spacing.md, gap: spacing.sm },
  journeyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  step: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(113,54,93,0.1)', justifyContent: 'center', alignItems: 'center' },
  stepText: { color: palette.plum, fontWeight: '800', fontSize: 13 },
  listTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  galleryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  photoDraft: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)', padding: 14, gap: 6 },
  photoDraftIcon: { color: palette.plum, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  photoDraftText: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  thread: { marginTop: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '84%', borderRadius: 18, padding: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)' },
  selfBubble: { alignSelf: 'flex-end', backgroundColor: palette.plum, borderColor: palette.plum },
  bubbleText: { color: palette.text, fontSize: 14, lineHeight: 20 },
  bubbleAuthor: { color: palette.muted, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  selfBubbleText: { color: '#fff' },
  composer: { marginTop: spacing.md, gap: spacing.sm },
  composerInput: { minHeight: 48, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,22,28,0.14)', backgroundColor: '#fff', color: palette.text, fontSize: 16, lineHeight: 21, paddingHorizontal: 14, paddingVertical: 12 },
  sendButton: { minHeight: 48, borderRadius: 16, backgroundColor: palette.plum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  threadError: { color: palette.coral, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
});
