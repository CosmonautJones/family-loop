import { createMockLoopedInService } from './mockAdapter';
import { createSupabaseLoopedInService } from './supabaseAdapter';
import { hasSupabaseConfig } from './supabaseClient';

export const loopedInService = hasSupabaseConfig ? createSupabaseLoopedInService() : createMockLoopedInService();
export const isServiceConfigured = hasSupabaseConfig;
