import { create } from 'zustand';
import type { CreateEventDraft } from '../features/events/createEvent';
import { createEventDraft } from '../features/events/createEvent';
import { loadDraftEvent, saveDraftEvent, saveString, storageKeys } from '../lib/storage';

export type LoopedInStore = {
  activeGroupId: string;
  setActiveGroupId: (groupId: string) => void;
  draftEvent: CreateEventDraft;
  updateDraftEvent: (patch: Partial<CreateEventDraft>) => void;
  resetDraftEvent: () => void;
  stagedPhotoCounts: Record<string, number>;
  stageEventPhoto: (eventId: string) => void;
  reminderDrafts: Record<string, boolean>;
  toggleReminderDraft: (eventId: string) => void;
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
  stagedPhotoCounts: {},
  stageEventPhoto: (eventId) => set((state) => ({
    stagedPhotoCounts: {
      ...state.stagedPhotoCounts,
      [eventId]: (state.stagedPhotoCounts[eventId] ?? 0) + 1,
    },
  })),
  reminderDrafts: {},
  toggleReminderDraft: (eventId) => set((state) => ({
    reminderDrafts: {
      ...state.reminderDrafts,
      [eventId]: !state.reminderDrafts[eventId],
    },
  })),
}));
