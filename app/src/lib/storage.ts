import type { CreateEventDraft } from '../features/events/createEvent';

const memoryStorage = new Map<string, string>();

export const storageKeys = {
  draftEvent: 'loopedin:draft-event',
  activeGroupId: 'loopedin:active-group-id',
} as const;

export function saveString(key: string, value: string) {
  memoryStorage.set(key, value);
}

export function getString(key: string) {
  return memoryStorage.get(key) ?? null;
}

export function saveDraftEvent(draft: CreateEventDraft) {
  saveString(storageKeys.draftEvent, JSON.stringify(draft));
}

export function loadDraftEvent() {
  const raw = getString(storageKeys.draftEvent);
  return raw ? (JSON.parse(raw) as CreateEventDraft) : null;
}
