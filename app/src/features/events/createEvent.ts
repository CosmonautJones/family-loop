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

export type EventForm = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
};

export type RequiredEventField = 'title' | 'date' | 'time' | 'location';
export type EventFormErrors = Partial<Record<RequiredEventField, string>>;

export function validateEventForm(form: EventForm): EventFormErrors {
  const errors: EventFormErrors = {};
  if (!form.title.trim()) errors.title = 'Add a name so your family can recognize the plan.';
  if (!form.location.trim()) errors.location = 'Add the place everyone should use.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = 'Use a date in YYYY-MM-DD format.';
  if (!/^\d{2}:\d{2}$/.test(form.time)) errors.time = 'Use a time in HH:MM format.';
  const startsAt = new Date(`${form.date}T${form.time}:00`);
  if (!errors.date && !errors.time) {
    const [year, month, day] = form.date.split('-').map(Number);
    const [hour, minute] = form.time.split(':').map(Number);
    const valid = !Number.isNaN(startsAt.getTime())
      && startsAt.getFullYear() === year
      && startsAt.getMonth() === month - 1
      && startsAt.getDate() === day
      && startsAt.getHours() === hour
      && startsAt.getMinutes() === minute;
    if (!valid) errors.date = 'Choose a real calendar date and time.';
  }
  return errors;
}

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
