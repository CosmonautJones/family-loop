import { create } from 'zustand';
import type { RSVPStatus } from '../types/domain';
import type { CreateEventDraft } from '../features/events/createEvent';
import { createEventDraft } from '../features/events/createEvent';
import { loadDraftEvent, saveDraftEvent, saveString, storageKeys } from '../lib/storage';

export type LoopedInStore = {
  activeGroupId: string;
  setActiveGroupId: (groupId: string) => void;
  draftEvent: CreateEventDraft;
  updateDraftEvent: (patch: Partial<CreateEventDraft>) => void;
  resetDraftEvent: () => void;
  rsvpOverrides: Record<string, RSVPStatus>;
  setRsvpStatus: (eventId: string, status: RSVPStatus) => void;
};

export const useLoopedInStore = create<LoopedInStore>((set) => ({
  activeGroupId: 'group-jones-family',
  setActiveGroupId: (groupId) => {
    saveString(storageKeys.activeGroupId, groupId);
    set({ activeGroupId: groupId });
  },
  draftEvent: loadDraftEvent() ?? createEventDraft,
  updateDraftEvent: (patch) => set((state) => {
    const draftEvent = { ...state.draftEvent, ...patch };
    saveDraftEvent(draftEvent);
    return { draftEvent };
  }),
  resetDraftEvent: () => {
    saveDraftEvent(createEventDraft);
    set({ draftEvent: createEventDraft });
  },
  rsvpOverrides: {},
  setRsvpStatus: (eventId, status) => set((state) => ({
    rsvpOverrides: { ...state.rsvpOverrides, [eventId]: status },
  })),
}));
