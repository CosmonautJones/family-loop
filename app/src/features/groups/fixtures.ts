import { createMockDatabase } from '../../services/mockData';

const database = createMockDatabase();

export const groupsOverview = {
  description: 'One private place for the Jones Family to plan trips, answer questions, and keep the photos afterward.',
  groups: database.groups,
  steps: [
    { title: 'Check the next trip', detail: 'See where and when everyone is meeting without searching old messages.' },
    { title: 'Answer in one place', detail: 'RSVP and add a comment directly on the trip.' },
    { title: 'Keep the photos attached', detail: 'Shared photos stay with the family memory after the trip.' },
  ],
} as const;
