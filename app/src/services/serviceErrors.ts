export type ServiceErrorCategory = 'network' | 'session' | 'access' | 'conflict' | 'rate-limit' | 'unknown';

type ErrorDetails = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

const safeMessages: Record<ServiceErrorCategory, string> = {
  network: 'We couldn’t reach LoopedIn. Check your connection and try again.',
  session: 'Your session has expired. Sign in again.',
  access: 'You don’t have access to do that.',
  conflict: 'That changed somewhere else. Refresh and try again.',
  'rate-limit': 'Too many attempts. Wait a moment and try again.',
  unknown: 'We couldn’t complete that request. Try again.',
};

const userSafeErrorName = 'LoopedInUserSafeError';

export function userServiceError(message: string): Error {
  const error = new Error(message);
  error.name = userSafeErrorName;
  return error;
}

function errorDetails(error: unknown): ErrorDetails {
  return error && typeof error === 'object' ? error as ErrorDetails : {};
}

function categoryForError(error: unknown): ServiceErrorCategory | null {
  const details = errorDetails(error);
  const code = String(details.code ?? '').toLowerCase();
  const status = Number(details.status ?? details.statusCode ?? 0);
  const message = String(details.message ?? (error instanceof Error ? error.message : error) ?? '').toLowerCase();

  if (error instanceof TypeError || /failed to fetch|network request failed|load failed|networkerror|fetch failed/.test(message)) return 'network';
  if (status === 401 || /jwt|token.*expired|session.*expired|pgrst301/.test(`${code} ${message}`)) return 'session';
  if (status === 403 || code === '42501' || /row-level security|permission denied|not authorized|forbidden/.test(message)) return 'access';
  if (status === 409 || ['23503', '23505', '409'].includes(code)) return 'conflict';
  if (status === 429 || code === '429' || /rate.?limit|too many requests/.test(message)) return 'rate-limit';

  if (details.code !== undefined || details.status !== undefined || details.statusCode !== undefined) return 'unknown';
  if (/bearer\s|password|credential|service[_ -]?role|[?&](token|signature)=|\/storage\/v1\/|postgres|postgrest|sqlstate/i.test(message)) return 'unknown';
  return null;
}

export function sanitizeServiceError(error: unknown): Error {
  if (error instanceof Error && error.name === userSafeErrorName) return error;
  const category = categoryForError(error);
  const safeError = new Error(safeMessages[category ?? 'unknown']);
  safeError.name = `LoopedInServiceError:${category ?? 'unknown'}`;
  return safeError;
}

export function backendServiceError(error: unknown): Error {
  return sanitizeServiceError(error);
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof value === 'object' && 'then' in value && typeof (value as Promise<unknown>).then === 'function');
}

export function withSafeServiceErrors<T extends object>(service: T): T {
  return Object.fromEntries(Object.entries(service).map(([areaName, area]) => {
    if (!area || typeof area !== 'object') return [areaName, area];
    const wrappedArea = Object.fromEntries(Object.entries(area).map(([methodName, method]) => {
      if (typeof method !== 'function') return [methodName, method];
      return [methodName, (...args: unknown[]) => {
        try {
          const result = method(...args);
          return isPromiseLike(result) ? result.catch((error) => { throw sanitizeServiceError(error); }) : result;
        } catch (error) {
          throw sanitizeServiceError(error);
        }
      }];
    }));
    return [areaName, wrappedArea];
  })) as T;
}
