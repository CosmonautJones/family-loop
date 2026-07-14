import { createMockDatabase } from '../../services/mockData';

const database = createMockDatabase();

export const people = database.groups[0].members ?? [];
export const heroEvent = database.events[0];
export const homeActivity = database.activity;
export const homeMemories = database.memories;
export const homeWeekSummary = '3 trips ahead · 5 family members · 1 memory ready';
export const homeActivityTitle = 'Plans, replies, and photos stay with the family trip.';
