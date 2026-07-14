import { createMockLoopedInService } from './mockAdapter';
import { createSupabaseLoopedInService } from './supabaseAdapter';
import { hasSupabaseConfig } from './supabaseClient';
import { createDurableLocalLoopedInService } from './durableLocalAdapter';
import { durableStorage } from '../lib/storage';
import type { LoopedInService } from './api';
import { browserActorSessionStore } from './localActorSession';

const dataMode = process.env.EXPO_PUBLIC_DATA_MODE;
export const isServiceConfigured = dataMode === 'supabase';

function createUnavailableSupabaseService(): LoopedInService {
  const error = new Error('Supabase data mode requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  const unavailable = new Proxy({}, { get: () => () => Promise.reject(error) });
  return {
    auth: {
      login: () => Promise.reject(error), signUp: () => Promise.reject(error), logout: () => Promise.reject(error),
      getSession: () => Promise.reject(error), refreshSession: () => Promise.reject(error),
      onAuthStateChange: () => () => undefined,
      listLocalProfiles: () => Promise.reject(error), chooseLocalProfile: () => Promise.reject(error),
    },
    groups: unavailable as LoopedInService['groups'], events: unavailable as LoopedInService['events'],
    rsvps: unavailable as LoopedInService['rsvps'], activity: unavailable as LoopedInService['activity'],
    thread: unavailable as LoopedInService['thread'], media: unavailable as LoopedInService['media'],
    notifications: unavailable as LoopedInService['notifications'],
  };
}

export const loopedInService = dataMode === 'supabase'
  ? hasSupabaseConfig ? createSupabaseLoopedInService() : createUnavailableSupabaseService()
  : dataMode === 'memory'
    ? createMockLoopedInService(undefined, { actorSession: browserActorSessionStore })
    : createDurableLocalLoopedInService(durableStorage, undefined, browserActorSessionStore);
