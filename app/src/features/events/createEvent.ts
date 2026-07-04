import { draftEventTemplate } from './eventData';

export type CreateEventDraft = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  notes: string;
  invitees: readonly string[];
  coverTreatment: string;
};

export type CreateEventField = {
  label: string;
  value: string;
  helper: string;
};

export function buildCreateEventFields(draft: CreateEventDraft): readonly CreateEventField[] {
  return [
    {
      label: 'Title',
      value: draft.title,
      helper: 'Name the moment so it is easy to find later.',
    },
    {
      label: 'Date & time',
      value: `${draft.dateLabel} · ${draft.timeLabel}`,
      helper: 'Lock the plan before invitees coordinate rides and food.',
    },
    {
      label: 'Location',
      value: draft.location,
      helper: 'Give everyone one exact place to anchor on event day.',
    },
    {
      label: 'Notes',
      value: draft.notes,
      helper: 'Capture supplies, reminders, and logistics while the idea is fresh.',
    },
    {
      label: 'Invitees',
      value: draft.invitees.join(', '),
      helper: 'Add the first people who need the update right away.',
    },
    {
      label: 'Cover treatment',
      value: draft.coverTreatment,
      helper: 'Cover treatment sets the tone before photos arrive.',
    },
  ] as const;
}

export function summarizeDraftEvent(draft: CreateEventDraft) {
  return `${draft.title} at ${draft.location} · ${draft.dateLabel} · ${draft.timeLabel} · ${draft.invitees.length} invitees`;
}

export const createEventDraft: CreateEventDraft = draftEventTemplate;
