import { createMockDatabase } from '../../services/mockData';

const database = createMockDatabase();

export const eventDetail = database.events[0];
export const eventDetails = database.events;
export const eventRsvps = database.rsvps;
export const eventThread = database.messages;
