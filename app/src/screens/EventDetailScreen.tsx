import { useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { SurfaceCard } from '../components/SurfaceCard';
import { selectEventDetailViewModel } from '../app/selectors';
import { useLoopedInStore } from '../store/useLoopedInStore';
import { palette, spacing } from '../theme/tokens';
import type { RSVPStatus } from '../types/domain';
import { useActiveGroupMembersQuery, useDeleteEventMutation, useDeleteMediaMutation, useEventMediaQuery, useEventMessagesQuery, useEventQuery, useEventRsvpsQuery, useSendMessageMutation, useUpdateEventMutation, useUploadMediaMutation, useUpsertRsvpMutation } from '../app/queries';
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
  const [photoUri, setPhotoUri] = useState('');
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
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const eventDetail = eventQuery.data?.groupId === activeGroupId ? selectEventDetailViewModel(eventQuery.data, rsvpsQuery.data ?? [], []) : null;
  const identity = auth.session;
  const currentMember = membersQuery.data?.find((member) => member.id === identity?.userId);
  const currentStatus = rsvpsQuery.data?.find((rsvp) => rsvp.personId === identity?.userId)?.status;

  if (!eventId) return <DetailState title="Event not found" detail="No event was selected." backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isPending || rsvpsQuery.isPending) return <DetailState title="Loading event" detail="Gathering the plan and responses…" backLabel={backLabel} onBack={onBack} />;
  if (eventQuery.isError || rsvpsQuery.isError) {
    const error = eventQuery.error ?? rsvpsQuery.error;
    return <DetailState title="We couldn’t load this event" detail={error instanceof Error ? error.message : 'Try again in a moment.'} backLabel={backLabel} onBack={onBack} />;
  }
  if (!eventDetail) return <DetailState title="Event not found" detail="This event may have been removed or is unavailable to this group." backLabel={backLabel} onBack={onBack} />;
  const setRsvpStatus = (status: RSVPStatus) => {
    if (!identity || upsertRsvp.isPending) return;
    upsertRsvp.mutate({ eventId: eventDetail.id, status });
  };
  const submitMessage = () => {
    const body = messageDraft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate({ eventId: eventDetail.id, body }, { onSuccess: () => setMessageDraft((current) => current.trim() === body ? '' : current) });
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {onBack ? <Button label={backLabel} onPress={onBack} /> : null}
      <View style={styles.heroCard}>
        <Text style={styles.heroMini}>{eventDetail.timeLabel}</Text>
        <View style={[styles.heroHeader, width <= 360 && styles.heroHeaderNarrow]}>
          <View style={styles.heroContent}>
            <Text role="heading" {...{ 'aria-level': 1 }} style={styles.heroTitle}>{eventDetail.title}</Text>
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
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.responseNote}>{upsertRsvp.isPending ? 'Saving your response…' : currentStatus ? rsvpNotes[currentStatus] : 'Choose a response so your family can plan around you.'}</Text>
        {upsertRsvp.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.responseNote}>{upsertRsvp.error instanceof Error ? upsertRsvp.error.message : 'We couldn’t save your response.'}</Text> : null}
        {canManagePlan ? (
          <View style={styles.planOptions}>
            <Text style={styles.planOptionsLabel}>Plan options</Text>
            <View style={styles.actionRow}>
              <Button label="Edit plan" tone="ghost" disabled={deleteEvent.isPending || updateEvent.isPending} onPress={beginEditing} />
              <Button label={deleteEvent.isPending ? 'Canceling plan…' : deleteEvent.isError ? 'Try canceling again' : 'Cancel plan'} tone="ghost" disabled={deleteEvent.isPending || updateEvent.isPending} onPress={cancelPlan} />
            </View>
            {deleteEvent.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.responseNote}>{deleteEvent.error instanceof Error ? deleteEvent.error.message : 'We couldn’t cancel this plan. Try again.'}</Text> : null}
          </View>
        ) : null}
      </View>

      {editForm ? (
        <SurfaceCard>
          <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Edit plan</Text>
          <Text style={styles.cardCopy}>Update the shared essentials. The original plan length stays the same.</Text>
          {([
            { key: 'title' as const, label: 'Trip or event name', placeholder: 'Family weekend' },
            { key: 'date' as const, label: 'Start date', placeholder: 'YYYY-MM-DD' },
            { key: 'time' as const, label: 'Start time', placeholder: 'HH:MM' },
            { key: 'location' as const, label: 'Location', placeholder: 'City, address, or meeting place' },
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
                editable={!updateEvent.isPending}
                onChangeText={(value) => changeEditField(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={palette.muted}
                style={[styles.input, editErrors[field.key] && styles.inputError]}
                value={editForm[field.key]}
              />
              {editErrors[field.key] ? <Text nativeID={`edit-${field.key}-error`} accessibilityRole="alert" style={styles.editError}>{editErrors[field.key]}</Text> : null}
            </View>
          ))}
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Notes (optional)</Text>
            <TextInput nativeID="edit-description-input" accessibilityLabel="Notes, optional" editable={!updateEvent.isPending} multiline onChangeText={(value) => changeEditField('description', value)} placeholder="What should everyone know?" placeholderTextColor={palette.muted} style={[styles.input, styles.notesInput]} value={editForm.description} />
          </View>
          {updateEvent.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.editError}>{updateEvent.error instanceof Error ? updateEvent.error.message : 'We couldn’t update this plan. Your changes are still here.'}</Text> : null}
          <View style={styles.lightActionRow}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: updateEvent.isPending || deleteEvent.isPending }} disabled={updateEvent.isPending || deleteEvent.isPending} onPress={savePlan} style={styles.planButton}><Text style={styles.planButtonText}>{updateEvent.isPending ? 'Saving changes…' : updateEvent.isError ? 'Try saving again' : 'Save changes'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: updateEvent.isPending || deleteEvent.isPending }} disabled={updateEvent.isPending || deleteEvent.isPending} onPress={() => setEditForm(null)} style={styles.secondaryPlanButton}><Text style={styles.secondaryPlanButtonText}>Keep current plan</Text></Pressable>
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Event details</Text>
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
        <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Thread</Text>
        {messagesQuery.isPending ? <Text accessibilityLiveRegion="polite" style={styles.cardCopy}>Loading the event conversation…</Text> : null}
        {messagesQuery.isError ? (
          <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{messagesQuery.error instanceof Error ? messagesQuery.error.message : 'We couldn’t load this conversation.'}</Text><Button label="Retry conversation" tone="secondary" onPress={() => messagesQuery.refetch()} /></View>
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
            accessibilityLabel="Message"
            autoComplete="off"
            multiline
            editable={!sendMessage.isPending}
            onChangeText={(value) => { setMessageDraft(value); sendMessage.reset(); }}
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
          <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{sendMessage.error instanceof Error ? sendMessage.error.message : 'We couldn’t send that message. Your draft is still here.'}</Text><Button label="Retry sending" tone="secondary" disabled={sendDisabled} onPress={submitMessage} /></View>
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
        {mediaQuery.isError ? <View style={styles.feedback}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{mediaQuery.error instanceof Error ? mediaQuery.error.message : 'We couldn’t load these photos.'}</Text><Button label="Retry photos" tone="secondary" onPress={() => mediaQuery.refetch()} /></View> : null}
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
                {item.uploadedBy === identity?.userId || currentMember?.role === 'owner' || currentMember?.role === 'admin' ? <Button
                  label={deleteMedia.isPending && deleteMedia.variables?.mediaId === item.id ? `Removing ${item.caption}…` : `Remove ${item.caption}`}
                  tone="ghost"
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
          <Pressable accessibilityRole="button" aria-controls="photo-composer" aria-expanded={false} onPress={() => { setPhotoComposerOpen(true); setPhotoError(''); }} style={styles.planButton}>
            <Text style={styles.planButtonText}>Add photo</Text>
          </Pressable>
        ) : (
          <View nativeID="photo-composer" style={styles.photoComposer}>
            <Text role="heading" {...{ 'aria-level': 2 }} style={styles.cardTitle}>Add a photo</Text>
            {!photoMode ? (
              <View style={styles.lightActionRow}>
                <Pressable accessibilityRole="button" onPress={choosePhoto} style={styles.planButton}><Text style={styles.planButtonText}>Choose image file</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => { setPhotoMode('link'); setPhotoUri(''); setPhotoError(''); uploadMedia.reset(); }} style={styles.secondaryPlanButton}><Text style={styles.secondaryPlanButtonText}>Add Unsplash link</Text></Pressable>
              </View>
            ) : null}
            {photoMode === 'file' ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: uploadMedia.isPending }} disabled={uploadMedia.isPending} onPress={choosePhoto} style={styles.secondaryPlanButton}><Text style={styles.secondaryPlanButtonText}>{photoUri.startsWith('data:') ? 'Choose another file' : 'Choose image file'}</Text></Pressable> : null}
            {photoMode === 'link' ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: uploadMedia.isPending }} disabled={uploadMedia.isPending} onPress={choosePhoto} style={styles.secondaryPlanButton}><Text style={styles.secondaryPlanButtonText}>Use image file instead</Text></Pressable> : null}
            {photoMode === 'link' ? <TextInput accessibilityLabel="Photo web address" autoCapitalize="none" autoComplete="url" keyboardType="url" onChangeText={(value) => { setPhotoUri(value); setPhotoError(''); uploadMedia.reset(); }} placeholder="HTTPS image address" placeholderTextColor={palette.muted} style={styles.input} value={photoUri} editable={!uploadMedia.isPending} /> : null}
            {photoMode && photoUri ? <Image accessibilityLabel={photoAltText || 'Selected photo preview'} source={{ uri: photoUri }} style={styles.preview} /> : null}
            {photoMode ? <TextInput accessibilityLabel="Photo caption" onChangeText={(value) => { setPhotoCaption(value); uploadMedia.reset(); }} placeholder="Caption (required)" placeholderTextColor={palette.muted} style={styles.input} value={photoCaption} editable={!uploadMedia.isPending} /> : null}
            {photoMode ? <TextInput accessibilityLabel="Image description" onChangeText={(value) => { setPhotoAltText(value); uploadMedia.reset(); }} placeholder="Image description (required)" placeholderTextColor={palette.muted} style={styles.input} value={photoAltText} editable={!uploadMedia.isPending} /> : null}
            {photoMode === 'link' ? <TextInput accessibilityLabel="Photographer name" autoComplete="name" onChangeText={(value) => { setCreatorName(value); uploadMedia.reset(); }} placeholder="Unsplash photographer (required)" placeholderTextColor={palette.muted} style={styles.input} value={creatorName} editable={!uploadMedia.isPending} /> : null}
            {photoMode === 'link' ? <TextInput accessibilityLabel="Unsplash source page" autoCapitalize="none" autoComplete="url" keyboardType="url" onChangeText={(value) => { setSourceUrl(value); setPhotoError(''); uploadMedia.reset(); }} placeholder="Unsplash photo page (required)" placeholderTextColor={palette.muted} style={styles.input} value={sourceUrl} editable={!uploadMedia.isPending} /> : null}
            {photoMode ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: uploadMedia.isPending }} disabled={uploadMedia.isPending} onPress={submitPhoto} style={styles.planButton}><Text style={styles.planButtonText}>{uploadMedia.isPending ? 'Sharing photo…' : uploadMedia.isError ? 'Retry sharing photo' : 'Share photo'}</Text></Pressable> : null}
            <Pressable accessibilityRole="button" aria-controls="photo-composer" aria-expanded accessibilityState={{ disabled: uploadMedia.isPending }} disabled={uploadMedia.isPending} onPress={() => { setPhotoComposerOpen(false); setPhotoMode(null); }} style={styles.secondaryPlanButton}><Text style={styles.secondaryPlanButtonText}>Close photo form</Text></Pressable>
            {photoError || uploadMedia.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.threadError}>{photoError || (uploadMedia.error instanceof Error ? uploadMedia.error.message : 'We couldn’t share this photo. Your details are still here.')}</Text> : null}
            {uploadMedia.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.successNote}>Photo shared with the family.</Text> : null}
          </View>
        )}
      </SurfaceCard>
    </ScrollView>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function isSafeHttpsUrl(value?: string): value is string {
  return Boolean(value && /^https:\/\//i.test(value));
}

function DetailState({ title, detail, backLabel, onBack }: { title: string; detail: string; backLabel: string; onBack?: () => void }) {
  return <View accessibilityLiveRegion="polite" style={styles.state}>{onBack ? <Button label={backLabel} onPress={onBack} /> : null}<SurfaceCard><Text role="heading" {...{ 'aria-level': 1 }} style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{detail}</Text></SurfaceCard></View>;
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  container: { width: '100%', maxWidth: '100%', minWidth: 0, padding: spacing.lg, gap: spacing.md, paddingBottom: 40, boxSizing: 'border-box' },
  heroCard: { backgroundColor: palette.plum, borderRadius: 28, padding: spacing.lg, gap: spacing.sm },
  heroMini: { color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11, fontWeight: '700' },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroHeaderNarrow: { flexDirection: 'column' },
  heroContent: { width: '100%', minWidth: 0, flex: 1 },
  heroTitle: { color: '#fff', fontSize: 32, lineHeight: 32, fontWeight: '900' },
  heroLocation: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, marginTop: 6, fontWeight: '800' },
  heroCopy: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  responseNote: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 19 },
  planOptions: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', marginTop: spacing.sm, paddingTop: spacing.sm, gap: spacing.xs },
  planOptionsLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '900' },
  cardCopy: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  journey: { marginTop: spacing.md, gap: spacing.sm },
  journeyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  step: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(113,54,93,0.1)', justifyContent: 'center', alignItems: 'center' },
  stepText: { color: palette.plum, fontWeight: '800', fontSize: 13 },
  listTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  galleryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  galleryGrid: { marginTop: spacing.md, gap: spacing.md },
  photoCard: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)', padding: 12, gap: 8 },
  photo: { width: '100%', height: 220, borderRadius: 12, backgroundColor: 'rgba(32,22,28,0.06)' },
  photoCaption: { color: palette.text, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  photoMeta: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  attributionLink: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  attributionText: { color: palette.plum, fontSize: 13, lineHeight: 18, fontWeight: '800', textDecorationLine: 'underline' },
  photoComposer: { marginTop: spacing.lg, gap: spacing.sm },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,22,28,0.14)', backgroundColor: '#fff', color: palette.text, fontSize: 16, lineHeight: 21, paddingHorizontal: 14, paddingVertical: 12 },
  inputError: { borderColor: palette.coral, borderWidth: 2 },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  editField: { gap: 6, marginTop: spacing.sm },
  editLabel: { color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  editError: { color: palette.coral, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  lightActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  planButton: { minHeight: 48, borderRadius: 999, backgroundColor: palette.plum, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  planButtonText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  secondaryPlanButton: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(113,54,93,0.24)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  secondaryPlanButtonText: { color: palette.plum, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  preview: { width: '100%', height: 200, borderRadius: 16, backgroundColor: 'rgba(32,22,28,0.06)' },
  thread: { marginTop: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '84%', borderRadius: 18, padding: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(32,22,28,0.08)' },
  selfBubble: { alignSelf: 'flex-end', backgroundColor: palette.plum, borderColor: palette.plum },
  bubbleText: { color: palette.text, fontSize: 14, lineHeight: 20 },
  bubbleAuthor: { color: palette.muted, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  bubbleTime: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  selfBubbleText: { color: '#fff' },
  selfBubbleTime: { color: 'rgba(255,255,255,0.78)' },
  composer: { marginTop: spacing.md, gap: spacing.sm },
  composerInput: { minHeight: 48, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,22,28,0.14)', backgroundColor: '#fff', color: palette.text, fontSize: 16, lineHeight: 21, paddingHorizontal: 14, paddingVertical: 12 },
  sendButton: { minHeight: 48, borderRadius: 16, backgroundColor: palette.plum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  threadError: { color: palette.coral, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  feedback: { gap: spacing.sm, alignItems: 'flex-start' },
  successNote: { color: palette.sage, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, fontWeight: '800' },
});
