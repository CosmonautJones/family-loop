function isPublishableKey(key) {
  if (key.startsWith('sb_secret_') || /service[_-]?role/i.test(key)) return false;
  if (key.startsWith('sb_publishable_')) return key.length >= 24;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role === 'anon';
  } catch {
    return false;
  }
}

export function parseRuntimeConfig(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Runtime config is not an object.');
  const allowed = new Set(['schemaVersion', 'environmentId', 'dataMode', 'supabaseUrl', 'supabasePublishableKey']);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('Runtime config has an unsupported field.');
  if (value.schemaVersion !== 1 || typeof value.environmentId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value.environmentId)) {
    throw new Error('Runtime config identity is invalid.');
  }
  if (value.dataMode === 'local') {
    if ('supabaseUrl' in value || 'supabasePublishableKey' in value) throw new Error('Local runtime config contains backend fields.');
    return { schemaVersion: 1, environmentId: value.environmentId, dataMode: 'local' };
  }
  if (value.dataMode !== 'supabase' || typeof value.supabaseUrl !== 'string' || typeof value.supabasePublishableKey !== 'string') {
    throw new Error('Runtime config mode is invalid.');
  }
  let url;
  try {
    url = new URL(value.supabaseUrl);
  } catch {
    throw new Error('Runtime config URL is invalid.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Runtime config URL is invalid.');
  }
  if (!isPublishableKey(value.supabasePublishableKey)) throw new Error('Runtime config key is invalid.');
  return {
    schemaVersion: 1,
    environmentId: value.environmentId,
    dataMode: 'supabase',
    supabaseUrl: url.origin,
    supabasePublishableKey: value.supabasePublishableKey,
  };
}

export function securityHeaders(releaseId, config) {
  const connectSources = ["'self'"];
  const imageSources = ["'self'", 'data:', 'blob:', 'https:'];
  if (config?.dataMode === 'supabase') {
    const backend = new URL(config.supabaseUrl);
    connectSources.push(backend.origin, `${backend.protocol === 'https:' ? 'wss:' : 'ws:'}//${backend.host}`);
    imageSources.push(backend.origin);
  }
  return {
    'Content-Security-Policy': `default-src 'self'; base-uri 'self'; connect-src ${connectSources.join(' ')}; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src ${imageSources.join(' ')}; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'`,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-LoopedIn-Release': releaseId,
    'X-LoopedIn-Environment': config?.environmentId ?? 'unavailable',
  };
}
