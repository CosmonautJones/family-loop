import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '../config/runtimeConfig';

const callbackFragment = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.hash.slice(1));
export const hasPasswordRecoveryCallback = callbackFragment.get('type') === 'recovery'
  || (callbackFragment.has('error_code') && /email link|recover|expired/i.test(callbackFragment.get('error_description') ?? ''));

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey: supabaseKey } = getRuntimeConfig();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or publishable key.');
  }

  client ??= createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: typeof window !== 'undefined',
    },
  });

  return client;
}
