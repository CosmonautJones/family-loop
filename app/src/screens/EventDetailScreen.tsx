import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as CoverImage } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Chip, StatusChip, type RsvpStatus } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectEventDetailViewModel } from '../app/selectors';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { accentForId, accentOf, fonts, palette, radii, shadow, spacing, tabBarInset } from '../theme/tokens';
import type { RSVPStatus } from '../types/domain';
import { useActiveGroupMembersQuery, useDeleteEventMutation, useDeleteMediaMutation, useEventMediaQuery, useEventMessagesQuery, useEventQuery, useEventReminderQuery, useEventRsvpsQuery, useSendMessageMutation, useSetEventReminderMutation, useUpdateEventMutation, useUploadMediaMutation, useUpsertRsvpMutation } from '../app/queries';
import { useAuthSession } from '../features/auth/AuthSessionProvider';
import { buildEventUpdate, canManageEvent, eventToForm, validateEventForm, type EventForm, type EventFormErrors, type RequiredEventField } from '../features/events/createEvent';

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
const rsvpChipStatus: Record<RSVPStatus, RsvpStatus> = {
  going: 'going',
  maybe: 'maybe',
  declined: 'cantGo',
};

export function EventDetailScreen({ eventId, backLabel = 'Back', onBack }: { eventId?: string; backLabel?: string; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const eventQuery = useEventQuery(eventId ?? '');
  const rsvpsQuery = useEventRsvpsQuery(eventId ?? '');
  const messagesQuery = useEventMessagesQuery(eventId ?? '');
  const mediaQuery = useEventMediaQuery(eventId ?? '');
  const membersQuery = useActiveGroupMembersQuery();
  const sendMessage = useSendMessageMutation();
  const uploadMedia = useUploadMediaMutation();
  const deleteMedia = useDeleteMediaMutation();
  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();
  const [messageDraft, setMessageDraft] = useState('');
  const messageOperationKey = useRef(crypto.randomUUID());
  const [photoUri, setPhotoUri] = useState('');
  const [photoPreviewUri, setPhotoPreviewUri] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoAltText, setPhotoAltText] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoComposerOpen, setPhotoComposerOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<'file' | 'link' | null>(null);
  const [editForm, setEditForm] = useState<EventForm | null>(null);
  const [editErrors, setEditErrors] = useState<EventFormErrors>({});
  const editInputRefs = useRef<Partial<Record<RequiredEventField, TextInput | null>>>({});
  const upsertRsvp = useUpsertRsvpMutation();
  const auth = useAuthSession();
  const reminderQuery = useEventReminderQuery(eventId ?? '', auth.session?.userId ?? '');
  const setReminder = useSetEventReminderMutation(auth.session?.userId ?? '');
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const eventDetail = eventQuery.data?.groupId === activeGroupId ? selectEventDetailViewModel(eventQuery.data, rsvpsQuery.data ?? [], []) : null;
  const identity = auth.session;
  const currentMember = membersQuery.data?.find((member) => member.id === identity?.userId);
  const currentStatus = rsvpsQuery.data?.find((rsvp) => rsvp.personId === identity?.userId)?.status;

  useEffect(() => {
    const uri = photoUri.trim();
    if (!uri) {
      setPhotoPreviewUri('');
      return;
    }
    const timeout = setTimeout(() => setPhotoPreviewUri(uri), 350);
    return () => clearTimeout(timeout);
  }, [photoUri]);

  if (!eventId) return <DetailState title="Event not found" detail="No event was selected." backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isPending || rsvpsQuery.isPending) return <DetailState title="Loading event" detail="Gathering the plan and responses…" backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isError || rsvpsQuery.isError) {
    const error = eventQuery.error ?? rsvpsQuery.error;
    return <DetailState title="We couldn’t load this event" detail={error instanceof Error ? error.message : 'Try again in a moment.'} backLabel={backLabel} onBack={onBack} />;
  }
  if (!eventDetail) return <DetailState title="Event not found" detail="This event may have been removed or is unavailable to this group." backLabel={backLabel} onBack={onBack} />;
  const accent = accentOf(accentForId(eventDetail.id));
  const setRsvpStatus = (status: RSVPStatus) => {
    if (!identity || upsertRsvp.isPending) return;
    upsertRsvp.mutate({ eventId: eventDetail.id, status });
  };
  const submitMessage = () => {
    const body = messageDraft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate({ eventId: eventDetail.id, body, operationKey: messageOperationKey.current }, { onSuccess: () => {
      messageOperationKey.current = crypto.randomUUID();
      setMessageDraft((current) => current.trim() === body ? '' : current);
    } });
  };
  const sendDisabled = !messageDraft.trim() || sendMessage.isPending;
  const submitPhoto = () => {
    const fileUri = photoUri.trim();
    const caption = photoCaption.trim();
    const altText = photoAltText.trim();
    if (!fileUri || !caption || !altText) {
      setPhotoError('Add a photo, caption, and image description.');
      return;
    }
    if (!fileUri.startsWith('data:image/') && !/^https:\/\//i.test(fileUri)) {
      setPhotoError('Use an HTTPS image address or choose an image file.');
      return;
    }
    const submittedSourceUrl = sourceUrl.trim();
    const submittedCreatorName = creatorName.trim();
    if (photoMode === 'link' && (!submittedCreatorName || !submittedSourceUrl)) {
      setPhotoError('Add the photographer and Unsplash photo page.');
      return;
    }
    if (photoMode === 'link' && !/^https:\/\/(?:www\.)?unsplash\.com\//i.test(submittedSourceUrl)) {
      setPhotoError('Use the HTTPS Unsplash photo page for attribution.');
      return;
    }
    setPhotoError('');
    uploadMedia.mutate({
      eventId: eventDetail.id,
      fileUri,
      caption,
      altText,
      ...(photoMode === 'link' ? {
        creatorName: submittedCreatorName,
        sourceName: 'Unsplash',
        sourceUrl: submittedSourceUrl,
      } : {}),
    }, {
      onSuccess: () => {
        setPhotoUri((current) => current.trim() === fileUri ? '' : current);
        setPhotoCaption((current) => current.trim() === caption ? '' : current);
        setPhotoAltText((current) => current.trim() === altText ? '' : current);
        setCreatorName((current) => current.trim() === submittedCreatorName ? '' : current);
        setSourceUrl((current) => current.trim() === submittedSourceUrl ? '' : current);
        setPhotoMode(null);
        setPhotoComposerOpen(false);
      },
    });
  };
  const choosePhoto = () => {
    setPhotoMode('file');
    setPhotoUri('');
    setCreatorName('');
    setSourceUrl('');
    setPhotoError('');
    uploadMedia.reset();
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setPhotoError('File selection is available in the web app. You can paste an HTTPS image address instead.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        setPhotoError('Choose a JPEG, PNG, or WebP image no larger than 1 MiB.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => setPhotoError('We couldn’t read that image. Try another file.');
      reader.onload = () => {
        setPhotoUri(String(reader.result ?? ''));
        setPhotoError('');
        uploadMedia.reset();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const beginEditing = () => {
    if (!eventQuery.data || deleteEvent.isPending) return;
    setEditForm(eventToForm(eventQuery.data));
    setEditErrors({});
    updateEvent.reset();
  };
  const changeEditField = (key: keyof EventForm, value: string) => {
    setEditForm((current) => current ? { ...current, [key]: value } : current);
    if (key !== 'description') setEditErrors((current) => ({ ...current, [key]: undefined }));
    updateEvent.reset();
  };
  const savePlan = async () => {
    if (!eventQuery.data || !editForm || updateEvent.isPending || deleteEvent.isPending) return;
    const submittedForm = { ...editForm };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      for (const key of ['title', 'date', 'time', 'location', 'description'] as const) {
        const input = document.getElementById(`edit-${key}-input`) as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) submittedForm[key] = input.value;
      }
      setEditForm(submittedForm);
    }
    const errors = validateEventForm(submittedForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = (['title', 'date', 'time', 'location'] as const).find((key) => errors[key]);
      if (firstInvalid) setTimeout(() => editInputRefs.current[firstInvalid]?.focus(), 0);
      return;
    }
    try {
      await updateEvent.mutateAsync({ eventId: eventQuery.data.id, patch: buildEventUpdate(eventQuery.data, submittedForm) });
      setEditForm(null);
    } catch { /* The mutation keeps the form open and exposes a retryable error below. */ }
  };
  const cancelPlan = async () => {
    if (!eventQuery.data || deleteEvent.isPending || updateEvent.isPending) return;
    const approved = Platform.OS !== 'web' || typeof window === 'undefined' || window.confirm(`Cancel “${eventQuery.data.title}”? This removes the plan for everyone.`);
    if (!approved) return;
    try {
      await deleteEvent.mutateAsync({ eventId: eventQuery.data.id, groupId: eventQuery.data.groupId });
      onBack?.();
    } catch { /* The mutation exposes a retry action below. */ }
  };
  const canManagePlan = Boolean(eventQuery.data && canManageEvent(eventQuery.data, currentMember));
  const reminderEnabled = Boolean(reminderQuery.data?.enabled);
  const changeReminder = (enabled: boolean) => setReminder.mutate({ eventId: eventDetail.id, enabled });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} accessibilityState={{ disabled: false }} onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={19} color={palette.text} />
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroCover}>
          {eventQuery.data?.coverUri ? (
            <CoverImage source={{ uri: eventQuery.data.coverUri }} style={styles.heroCoverFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={accent.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCoverFill} />
          )}
        </View>
        <View style={[styles.heroBody, width <= 360 && styles.heroBodyNarrow]}>
          <View style={styles.heroMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={accent.deep} />
            <Text style={[styles.heroMeta, { color: accent.deep }]}>{eventDetail.timeLabel}</Text>
          </View>
          <Text role="heading" {...{ 'aria-level': 1 }} style={styles.heroTitle}>{eventDetail.title}</Text>
          <View style={styles.heroMetaRow}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <Text style={styles.heroLocation}>{eventDetail.location}</Text>
          </View>
          <Text style={styles.heroCopy}>{eventDetail.description}</Text>

          <View style={styles.heroStatusRow}>
            <StatusChip status={currentStatus ? rsvpChipStatus[currentStatus] : 'pending'} label={currentStatus ? undefined : 'No response yet'} />
            <Text style={styles.rsvpSummary}>{eventDetail.rsvpSummary}</Text>
          </View>

          <View style={styles.segmentRow}>
            {rsvpOptions.map((status) => {
              const active = status === currentStatus;
              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityLabel={rsvpLabels[status]}
                  accessibilityState={{ disabled: upsertRsvp.isPending, selected: active }}
                  disabled={upsertRsvp.isPending}
                  onPress={() => setRsvpStatus(status)}
                  style={[styles.segment, active && styles.segmentActive, upsertRsvp.isPending && styles.segmentDisabled]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{rsvpLabels[status]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.responseNote}>{upsertRsvp.isPending ? 'Saving your response…' : currentStatus ? rsvpNotes[currentStatus] : 'Choose a response so your family can plan around you.'}</Text>
          {upsertRsvp.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorNote}>{upsertRsvp.error instanceof Error ? upsertRsvp.error.message : 'We couldn’t save your response.'}</Text> : null}
          {canManagePlan ? (
            <View style={styles.planOptions}>
              <Text style={styles.planOptionsLabel}>Plan options</Text>
              <View style={styles.lightActionRow}>
                <SecondaryAction label="Edit plan" disabled={deleteEvent.isPending || updateEvent.isPending} onPress={beginEditing} />
                <SecondaryAction label={deleteEvent.isPending ? 'Canceling plan…' : deleteEvent.isError ? 'Try canceling again' : 'Cancel plan'} tone="danger" disabled={deleteEvent.isPending || updateEvent.isPending} onPress={cancelPlan} />
              </View>
              {deleteEvent.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorNote}>{deleteEvent.error instanceof Error ? deleteEvent.error.message : 'We couldn’t cancel this plan. Try again.'}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>

      {editForm ? (
        <SurfaceCard>
          <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Edit plan</Text>
          <Text style={styles.cardCopy}>Update the shared essentials. The original plan length stays the same.</Text>
          {([
            { key: 'title' as const, label: 'Trip or event name', placeholder: 'Family weekend', autoComplete: 'off' as const },
            { key: 'date' as const, label: 'Start date', placeholder: 'YYYY-MM-DD', autoComplete: 'off' as const },
            { key: 'time' as const, label: 'Start time', placeholder: 'HH:MM', autoComplete: 'off' as const },
            { key: 'location' as const, label: 'Location', placeholder: 'City, address, or meeting place', autoComplete: 'street-address' as const },
          ]).map((field) => (
            <View key={field.key} style={styles.editField}>
              <Text nativeID={`edit-${field.key}-label`} style={styles.editLabel}>{field.label} (required)</Text>
              <TextInput
                {...(editErrors[field.key] ? { 'aria-describedby': `edit-${field.key}-error`, 'aria-invalid': true } : { 'aria-invalid': false })}
                ref={(node) => { editInputRefs.current[field.key] = node; }}
                nativeID={`edit-${field.key}-input`}
                accessibilityLabel={field.label}
                accessibilityLabelledBy={`edit-${field.key}-label`}
                aria-required
                autoComplete={field.autoComplete}
                editable={!updateEvent.isPending}
                onChangeText={(value) => changeEditField(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={palette.faint}
                style={[styles.input, editErrors[field.key] && styles.inputError]}
                value={editForm[field.key]}
              />
              {editErrors[field.key] ? <Text nativeID={`edit-${field.key}-error`} accessibilityRole="alert" style={styles.editError}>{editErrors[field.key]}</Text> : null}
            </View>
          ))}
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Notes (optional)</Text>
            <TextInput nativeID="edit-description-input" accessibilityLabel="Notes, optional" autoComplete="off" editable={!updateEvent.isPending} multiline onChangeText={(value) => changeEditField('description', value)} placeholder="What should everyone know?" placeholderTextColor={palette.faint} style={[styles.input, styles.notesInput]} value={editForm.description} />
          </View>
          {updateEvent.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.editError}>{updateEvent.error instanceof Error ? updateEvent.error.message : 'We couldn’t update this plan. Your changes are still here.'}</Text> : null}
          <View style={styles.lightActionRow}>
            <PrimaryAction label={updateEvent.isPending ? 'Saving changes…' : updateEvent.isError ? 'Try saving again' : 'Save changes'} disabled={updateEvent.isPending || deleteEvent.isPending} onPress={savePlan} />
            <SecondaryAction label="Keep current plan" disabled={updateEvent.isPending || deleteEvent.isPending} onPress={() => setEditForm(null)} />
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Event reminder</Text>
        <Text style={styles.reminderTiming}>Morning of event</Text>
        <Text style={styles.cardCopy}>This saves an in-app preference for this event. Push and email delivery are not active.</Text>
        {reminderQuery.isPending ? <Text accessibilityLiveRegion="polite" style={styles.cardCopy}>Loading your preference…</Text> : null}
        {reminderQuery.isError ? (
          <View style={styles.feedback}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{reminderQuery.error instanceof Error ? reminderQuery.error.message : 'We couldn’t load your reminder preference.'}</Text>
            <SecondaryAction label="Retry reminder preference" onPress={() => reminderQuery.refetch()} />
          </View>
        ) : null}
        {reminderQuery.isSuccess ? (
          <Pressable
            accessibilityLabel={`Morning of event reminder preference, ${reminderEnabled ? 'on' : 'off'}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderEnabled, disabled: setReminder.isPending }}
            aria-checked={reminderEnabled}
            disabled={setReminder.isPending}
            onPress={() => changeReminder(!reminderEnabled)}
            style={[styles.reminderSwitch, reminderEnabled && styles.reminderSwitchOn]}
          >
            <Text style={[styles.reminderSwitchText, reminderEnabled && styles.reminderSwitchTextOn]}>{setReminder.isPending ? 'Saving…' : reminderEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        ) : null}
        {setReminder.isError ? (
          <View style={styles.feedback}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>We couldn’t save your preference. Your choice is ready to retry.</Text>
            <SecondaryAction label={`Retry turning ${setReminder.variables?.enabled ? 'on' : 'off'}`} onPress={() => setReminder.variables && changeReminder(setReminder.variables.enabled)} />
          </View>
        ) : null}
        {setReminder.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.successNote}>In-app preference {reminderEnabled ? 'on' : 'off'}.</Text> : null}
      </SurfaceCard>

      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Event details</Text>
        <View style={styles.journey}>
          {eventDetail.sections.map((section, index) => (
            <View key={section.title} style={styles.journeyRow}>
              <View style={[styles.step, { backgroundColor: accent.tint }]}><Text style={[styles.stepText, { color: accent.deep }]}>{index + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{section.title}</Text>
                <Text style={styles.cardCopy}>{section.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Thread</Text>
        {messagesQuery.isPending ? <Text accessibilityLiveRegion="polite" style={styles.cardCopy}>Loading the event conversation…</Text> : null}
        {messagesQuery.isError ? (
          <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{messagesQuery.error instanceof Error ? messagesQuery.error.message : 'We couldn’t load this conversation.'}</Text><SecondaryAction label="Retry conversation" onPress={() => messagesQuery.refetch()} /></View>
        ) : null}
        {messagesQuery.isSuccess && messagesQuery.data.length === 0 ? <Text style={styles.cardCopy}>No messages yet. Start the plan here.</Text> : null}
        {messagesQuery.isSuccess && messagesQuery.data.length > 0 ? (
          <View style={styles.thread}>
            {messagesQuery.data.map((item) => (
              <View key={item.id} style={[styles.bubble, item.self && styles.selfBubble]}>
                <Text style={[styles.bubbleAuthor, item.self && styles.selfBubbleText]}>{item.authorName}</Text>
                <Text style={[styles.bubbleText, item.self && styles.selfBubbleText]}>{item.body}</Text>
                <Text style={[styles.bubbleTime, item.self && styles.selfBubbleTime]}>{formatMessageTime(item.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            nativeID="event-message-input"
            accessibilityLabel="Message"
            autoComplete="off"
            multiline
            editable={!sendMessage.isPending}
            onChangeText={(value) => { messageOperationKey.current = crypto.randomUUID(); setMessageDraft(value); sendMessage.reset(); }}
            placeholder="Add a note for this event"
            placeholderTextColor={palette.faint}
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
          <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{sendMessage.error instanceof Error ? sendMessage.error.message : 'We couldn’t send that message. Your draft is still here.'}</Text><SecondaryAction label="Retry sending" disabled={sendDisabled} onPress={submitMessage} /></View>
        ) : null}
        {sendMessage.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.successNote}>Comment shared.</Text> : null}
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.galleryHeader}>
          <View style={{ flex: 1 }}>
            <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Event gallery</Text>
            <Text style={styles.cardCopy}>Family photos stay with this plan.</Text>
          </View>
          <Chip label={`${mediaQuery.data?.length ?? 0} shared`} tone={mediaQuery.data?.length ? 'coral' : 'sky'} />
        </View>
        {mediaQuery.isPending ? <Text accessibilityLiveRegion="polite" style={styles.cardCopy}>Loading shared photos…</Text> : null}
        {mediaQuery.isError ? <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{mediaQuery.error instanceof Error ? mediaQuery.error.message : 'We couldn’t load these photos.'}</Text><SecondaryAction label="Retry photos" onPress={() => mediaQuery.refetch()} /></View> : null}
        {mediaQuery.isSuccess && mediaQuery.data.length === 0 ? <Text style={styles.cardCopy}>No photos yet.</Text> : null}
        {mediaQuery.isSuccess && mediaQuery.data.length > 0 ? (
          <View style={styles.galleryGrid}>
            {mediaQuery.data.map((item) => (
              <View key={item.id} style={styles.photoCard}>
                <Image accessibilityLabel={item.altText} source={{ uri: item.uri }} style={styles.photo} />
                <Text style={styles.photoCaption}>{item.caption}</Text>
                <Text style={styles.photoMeta}>Shared {formatMessageTime(item.uploadedAt)}</Text>
                {item.creatorName || item.sourceName ? isSafeHttpsUrl(item.sourceUrl) ? (
                  <Pressable accessibilityRole="link" onPress={() => Linking.openURL(item.sourceUrl!)} style={styles.attributionLink}>
                    <Text style={styles.attributionText}>Photo{item.creatorName ? ` by ${item.creatorName}` : ''}{item.sourceName ? ` on ${item.sourceName}` : ''}</Text>
                  </Pressable>
                ) : <Text style={styles.photoMeta}>Photo{item.creatorName ? ` by ${item.creatorName}` : ''}{item.sourceName ? ` via ${item.sourceName}` : ''}</Text> : null}
                {item.uploadedBy === identity?.userId || currentMember?.role === 'owner' || currentMember?.role === 'admin' ? <SecondaryAction
                  label={deleteMedia.isPending && deleteMedia.variables?.mediaId === item.id ? `Removing ${item.caption}…` : `Remove ${item.caption}`}
                  tone="danger"
                  disabled={deleteMedia.isPending}
                  onPress={() => {
                    const approved = Platform.OS !== 'web' || typeof window === 'undefined' || window.confirm('Remove this photo from the family event?');
                    if (approved) deleteMedia.mutate({ mediaId: item.id, eventId: eventDetail.id });
                  }}
                /> : null}
              </View>
            ))}
          </View>
        ) : null}
        {deleteMedia.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{deleteMedia.error instanceof Error ? deleteMedia.error.message : 'We couldn’t remove that photo.'}</Text> : null}
      </SurfaceCard>

      <SurfaceCard>
        {!photoComposerOpen ? (
          <Pressable accessibilityRole="button" aria-controls="photo-composer" aria-expanded={false} onPress={() => { setPhotoComposerOpen(true); setPhotoError(''); }} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Add photo</Text>
          </Pressable>
        ) : (
          <View nativeID="photo-composer" style={styles.photoComposer}>
            <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Add a photo</Text>
            {!photoMode ? (
              <View style={styles.lightActionRow}>
                <PrimaryAction label="Choose image file" onPress={choosePhoto} />
                <SecondaryAction label="Add Unsplash link" onPress={() => { setPhotoMode('link'); setPhotoUri(''); setPhotoError(''); uploadMedia.reset(); }} />
              </View>
            ) : null}
            {photoMode === 'file' ? <SecondaryAction label={photoUri.startsWith('data:') ? 'Choose another file' : 'Choose image file'} disabled={uploadMedia.isPending} onPress={choosePhoto} /> : null}
            {photoMode === 'link' ? <SecondaryAction label="Use image file instead" disabled={uploadMedia.isPending} onPress={choosePhoto} /> : null}
            {photoMode === 'link' ? <TextInput nativeID="event-photo-url-input" accessibilityLabel="Photo web address" autoCapitalize="none" autoComplete="url" keyboardType="url" onChangeText={(value) => { setPhotoUri(value); setPhotoError(''); uploadMedia.reset(); }} placeholder="HTTPS image address" placeholderTextColor={palette.faint} style={styles.input} value={photoUri} editable={!uploadMedia.isPending} /> : null}
            {photoMode && photoPreviewUri ? <Image accessibilityLabel={photoAltText || 'Selected photo preview'} source={{ uri: photoPreviewUri }} style={styles.preview} /> : null}
            {photoMode ? <TextInput nativeID="event-photo-caption-input" accessibilityLabel="Photo caption" autoComplete="off" onChangeText={(value) => { setPhotoCaption(value); uploadMedia.reset(); }} placeholder="Caption (required)" placeholderTextColor={palette.faint} style={styles.input} value={photoCaption} editable={!uploadMedia.isPending} /> : null}
            {photoMode ? <TextInput nativeID="event-photo-description-input" accessibilityLabel="Image description" autoComplete="off" onChangeText={(value) => { setPhotoAltText(value); uploadMedia.reset(); }} placeholder="Image description (required)" placeholderTextColor={palette.faint} style={styles.input} value={photoAltText} editable={!uploadMedia.isPending} /> : null}
            {photoMode === 'link' ? <TextInput nativeID="event-photo-photographer-input" accessibilityLabel="Photographer name" autoComplete="name" onChangeText={(value) => { setCreatorName(value); uploadMedia.reset(); }} placeholder="Unsplash photographer (required)" placeholderTextColor={palette.faint} style={styles.input} value={creatorName} editable={!uploadMedia.isPending} /> : null}
            {photoMode === 'link' ? <TextInput nativeID="event-photo-source-input" accessibilityLabel="Unsplash source page" autoCapitalize="none" autoComplete="url" keyboardType="url" onChangeText={(value) => { setSourceUrl(value); setPhotoError(''); uploadMedia.reset(); }} placeholder="Unsplash photo page (required)" placeholderTextColor={palette.faint} style={styles.input} value={sourceUrl} editable={!uploadMedia.isPending} /> : null}
            {photoMode ? <PrimaryAction label={uploadMedia.isPending ? 'Sharing photo…' : uploadMedia.isError ? 'Retry sharing photo' : 'Share photo'} disabled={uploadMedia.isPending} onPress={submitPhoto} /> : null}
            <SecondaryAction label="Close photo form" disabled={uploadMedia.isPending} onPress={() => { setPhotoComposerOpen(false); setPhotoMode(null); }} accessibilityProps={{ 'aria-controls': 'photo-composer', 'aria-expanded': true }} />
            {photoError || uploadMedia.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{photoError || (uploadMedia.error instanceof Error ? uploadMedia.error.message : 'We couldn’t share this photo. Your details are still here.')}</Text> : null}
            {uploadMedia.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.successNote}>Photo shared with the family.</Text> : null}
          </View>
        )}
      </SurfaceCard>
    </ScrollView>
  );
}

function PrimaryAction({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.buttonDisabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryAction({ label, disabled = false, tone = 'plum', onPress, accessibilityProps }: { label: string; disabled?: boolean; tone?: 'plum' | 'danger'; onPress?: () => void; accessibilityProps?: Record<string, unknown> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.secondaryButton, disabled && styles.buttonDisabled]} {...accessibilityProps}>
      <Text style={[styles.secondaryButtonText, tone === 'danger' && styles.secondaryButtonTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function isSafeHttpsUrl(value?: string): value is string {
  return Boolean(value && /^https:\/\//i.test(value));
}

function DetailState({ title, detail, backLabel, onBack }: { title: string; detail: string; backLabel: string; onBack?: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} accessibilityState={{ disabled: false }} onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={19} color={palette.text} />
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>
      ) : null}
      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 1 }} style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCopy}>{detail}</Text>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  container: { width: '100%', maxWidth: '100%', minWidth: 0, padding: spacing.lg, gap: spacing.md, paddingBottom: tabBarInset, boxSizing: 'border-box' },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, paddingVertical: 8, paddingRight: 10 },
  backLabel: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },

  heroCard: { backgroundColor: palette.surface, borderRadius: radii.hero, borderWidth: 1, borderColor: palette.hairline, overflow: 'hidden', ...shadow.soft },
  heroCover: { height: 160, width: '100%', backgroundColor: palette.well },
  heroCoverFill: { height: '100%', width: '100%' },
  heroBody: { padding: spacing.lg, gap: spacing.sm },
  heroBodyNarrow: { padding: spacing.md },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMeta: { fontFamily: fonts.semibold, fontWeight: '600', fontSize: 12.5, letterSpacing: 0.2 },
  heroTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 27, lineHeight: 31, letterSpacing: -0.5 },
  heroLocation: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13.5 },
  heroCopy: { color: palette.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  rsvpSummary: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13 },

  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segment: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentActive: { backgroundColor: palette.plum, borderColor: palette.plum },
  segmentDisabled: { opacity: 0.6 },
  segmentText: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: palette.white },

  responseNote: { color: palette.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  errorNote: { color: palette.berry, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, lineHeight: 19 },
  planOptions: { borderTopWidth: 1, borderTopColor: palette.hairline, marginTop: spacing.xs, paddingTop: spacing.sm, gap: spacing.xs },
  planOptionsLabel: { color: palette.muted, fontFamily: fonts.bold, fontWeight: '700', fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase' },

  cardTitle: { color: palette.text, fontFamily: fonts.bold, fontWeight: '700', fontSize: 19, letterSpacing: -0.3 },
  cardCopy: { color: palette.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: 4 },
  reminderTiming: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15.5, marginTop: spacing.xs },
  reminderSwitch: { minWidth: 72, minHeight: 46, alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: 18, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.hairline, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  reminderSwitchOn: { backgroundColor: palette.plum, borderColor: palette.plum },
  reminderSwitchText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14.5 },
  reminderSwitchTextOn: { color: palette.white },

  journey: { marginTop: spacing.sm, gap: spacing.sm },
  journeyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  step: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepText: { fontFamily: fonts.bold, fontWeight: '700', fontSize: 13 },
  listTitle: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 15 },

  galleryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  galleryGrid: { marginTop: spacing.sm, gap: spacing.md },
  photoCard: { overflow: 'hidden', borderRadius: radii.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.hairline, padding: 12, gap: 8 },
  photo: { width: '100%', height: 220, borderRadius: 12, backgroundColor: palette.well },
  photoCaption: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14.5 },
  photoMeta: { color: palette.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  attributionLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  attributionText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, lineHeight: 18, textDecorationLine: 'underline' },

  photoComposer: { marginTop: spacing.sm, gap: spacing.sm },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.surface, color: palette.text, fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 21, paddingHorizontal: 14, paddingVertical: 12 },
  inputError: { borderColor: palette.coral, borderWidth: 2 },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  editField: { gap: 6, marginTop: spacing.sm },
  editLabel: { color: palette.text, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13.5 },
  editError: { color: palette.berry, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13 },
  lightActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },

  primaryButton: { minHeight: 46, borderRadius: radii.pill, backgroundColor: palette.plum, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: palette.white, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14.5 },
  secondaryButton: { minHeight: 46, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.surface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14.5 },
  secondaryButtonTextDanger: { color: palette.berry },
  buttonDisabled: { opacity: 0.5 },

  preview: { width: '100%', height: 200, borderRadius: radii.md, backgroundColor: palette.well },
  thread: { marginTop: spacing.sm, gap: spacing.sm },
  bubble: { maxWidth: '84%', borderRadius: radii.md, padding: 13, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.hairline },
  selfBubble: { alignSelf: 'flex-end', backgroundColor: palette.plum, borderColor: palette.plum },
  bubbleText: { color: palette.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bubbleAuthor: { color: palette.muted, fontFamily: fonts.bold, fontWeight: '700', fontSize: 12, marginBottom: 3 },
  bubbleTime: { color: palette.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 6 },
  selfBubbleText: { color: palette.white },
  selfBubbleTime: { color: 'rgba(255,255,255,0.78)' },
  composer: { marginTop: spacing.sm, gap: spacing.sm },
  composerInput: { minHeight: 48, maxHeight: 120, borderRadius: radii.md, borderWidth: 1, borderColor: palette.hairline, backgroundColor: palette.surface, color: palette.text, fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 21, paddingHorizontal: 14, paddingVertical: 12 },
  sendButton: { minHeight: 46, borderRadius: radii.md, backgroundColor: palette.plum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: palette.white, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 14.5 },
  threadError: { color: palette.berry, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  feedback: { gap: spacing.sm, alignItems: 'flex-start' },
  successNote: { color: palette.plum, fontFamily: fonts.semibold, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
});
