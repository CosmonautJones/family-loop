import type { CreateEventDraft } from '../features/events/createEvent';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export function loadActiveGroupId() {
  const stored = getString(storageKeys.activeGroupId);
  return stored && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(stored) ? stored : '';
}

export function saveDraftEvent(draft: CreateEventDraft) {
  saveString(storageKeys.draftEvent, JSON.stringify(draft));
}

export function loadDraftEvent() {
  const raw = getString(storageKeys.draftEvent);
  return raw ? (JSON.parse(raw) as CreateEventDraft) : null;
}

export const durableStorage = AsyncStorage;
