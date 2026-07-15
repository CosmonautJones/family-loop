import { createMockLoopedInService } from './mockAdapter';
import { createSupabaseLoopedInService } from './supabaseAdapter';
import { createDurableLocalLoopedInService } from './durableLocalAdapter';
import { durableStorage } from '../lib/storage';
import type { LoopedInService } from './api';
import { browserActorSessionStore } from './localActorSession';
import { getRuntimeConfig } from '../config/runtimeConfig';

export function isServiceConfigured() {
  return getRuntimeConfig().dataMode === 'supabase';
}

function createUnavailableSupabaseService(): LoopedInService {
  const error = new Error('Supabase data mode requires a valid URL and publishable key.');
  const unavailable = new Proxy({}, { get: () => () => Promise.reject(error) });
  return {
    auth: {
      login: () => Promise.reject(error), signUp: () => Promise.reject(error), logout: () => Promise.reject(error),
      requestPasswordReset: () => Promise.reject(error), updatePassword: () => Promise.reject(error),
      getSession: () => Promise.reject(error), refreshSession: () => Promise.reject(error),
      onAuthStateChange: () => () => undefined,
      listLocalProfiles: () => Promise.reject(error), chooseLocalProfile: () => Promise.reject(error),
    },
    groups: unavailable as LoopedInService['groups'], events: unavailable as LoopedInService['events'],
    rsvps: unavailable as LoopedInService['rsvps'], activity: unavailable as LoopedInService['activity'],
    thread: {
      listMessages: () => Promise.reject(error),
      sendMessage: () => Promise.reject(error),
      subscribeMessages: () => () => undefined,
    }, media: unavailable as LoopedInService['media'],
    notifications: unavailable as LoopedInService['notifications'],
    reminders: unavailable as LoopedInService['reminders'],
  };
}

let service: LoopedInService | null = null;

function getService() {
  if (service) return service;
  const config = getRuntimeConfig();
  service = config.dataMode === 'supabase'
    ? config.supabaseUrl && config.supabasePublishableKey ? createSupabaseLoopedInService() : createUnavailableSupabaseService()
    : config.dataMode === 'memory'
      ? createMockLoopedInService(undefined, { actorSession: browserActorSessionStore })
      : createDurableLocalLoopedInService(durableStorage, undefined, browserActorSessionStore);
  return service;
}

export const loopedInService = new Proxy({} as LoopedInService, {
  get: (_, property: keyof LoopedInService) => getService()[property],
});
