import { Platform } from 'react-native';

export type RuntimeConfig = {
  schemaVersion: 1;
  environmentId: string;
  dataMode: 'local' | 'memory' | 'supabase';
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const compiledDataMode = process.env.EXPO_PUBLIC_DATA_MODE;
export const usesWebRuntimeConfig = Platform.OS === 'web' && compiledDataMode === 'runtime';

export function getReleaseId() {
  return process.env.EXPO_PUBLIC_RELEASE_ID ?? 'development';
}

let runtimeConfig: RuntimeConfig | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPublishableKey(value: string) {
  if (value.startsWith('sb_secret_') || /service[_-]?role/i.test(value)) return false;
  if (value.startsWith('sb_publishable_')) return value.length >= 24;

  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(globalThis.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as { role?: unknown };
    return payload.role === 'anon';
  } catch {
    return false;
  }
}

function isSafeSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    return (url.protocol === 'https:' || (url.protocol === 'http:' && loopback))
      && !url.username && !url.password && !url.search && !url.hash && (url.pathname === '/' || url.pathname === '');
  } catch {
    return false;
  }
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!isRecord(value)) throw new Error('Runtime configuration must be a JSON object.');
  const allowed = new Set(['schemaVersion', 'environmentId', 'dataMode', 'supabaseUrl', 'supabasePublishableKey']);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('Runtime configuration contains an unsupported field.');
  if (value.schemaVersion !== 1) throw new Error('Runtime configuration version is unsupported.');
  if (typeof value.environmentId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value.environmentId)) {
    throw new Error('Runtime configuration environment is invalid.');
  }
  if (value.dataMode !== 'local' && value.dataMode !== 'supabase') throw new Error('Runtime configuration data mode is invalid.');

  if (value.dataMode === 'local') {
    if ('supabaseUrl' in value || 'supabasePublishableKey' in value) {
      throw new Error('Local runtime configuration cannot include backend credentials.');
    }
    return { schemaVersion: 1, environmentId: value.environmentId, dataMode: 'local' };
  }

  if (typeof value.supabaseUrl !== 'string' || !isSafeSupabaseUrl(value.supabaseUrl)) {
    throw new Error('Runtime configuration backend URL is invalid.');
  }
  if (typeof value.supabasePublishableKey !== 'string' || !isPublishableKey(value.supabasePublishableKey)) {
    throw new Error('Runtime configuration publishable key is invalid.');
  }
  return {
    schemaVersion: 1,
    environmentId: value.environmentId,
    dataMode: 'supabase',
    supabaseUrl: value.supabaseUrl,
    supabasePublishableKey: value.supabasePublishableKey,
  };
}

function compiledConfig(): RuntimeConfig {
  const dataMode = compiledDataMode === 'memory' ? 'memory' : compiledDataMode === 'supabase' ? 'supabase' : 'local';
  return {
    schemaVersion: 1,
    environmentId: process.env.EXPO_PUBLIC_ENVIRONMENT_ID ?? 'development',
    dataMode,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function initializeRuntimeConfig() {
  if (runtimeConfig) return runtimeConfig;
  if (!usesWebRuntimeConfig) {
    runtimeConfig = compiledConfig();
    return runtimeConfig;
  }

  const response = await fetch('/runtime-config.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Runtime configuration is unavailable.');
  runtimeConfig = parseRuntimeConfig(await response.json());
  return runtimeConfig;
}

export function getRuntimeConfig() {
  if (!runtimeConfig) {
    if (usesWebRuntimeConfig) throw new Error('Runtime configuration has not been initialized.');
    runtimeConfig = compiledConfig();
  }
  return runtimeConfig;
}
