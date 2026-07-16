import type { ClientErrorCategory, ClientErrorOperation } from './clientErrorTelemetry';

export type ServiceErrorCategory = 'network' | 'session' | 'access' | 'conflict' | 'rate-limit' | 'unknown';

export type ServiceErrorTelemetry = (event: {
  operation: ClientErrorOperation;
  category: ClientErrorCategory;
}) => void;

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
const serviceErrorPrefix = 'LoopedInServiceError:';
const serviceErrorCategories = new Set<ServiceErrorCategory>(['network', 'session', 'access', 'conflict', 'rate-limit', 'unknown']);

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
  const hasStatus = details.status !== undefined || details.statusCode !== undefined;
  const name = error instanceof Error ? error.name.toLowerCase() : '';
  const message = String(details.message ?? (error instanceof Error ? error.message : error) ?? '').toLowerCase();

  if (error instanceof TypeError || name === 'authretryablefetcherror' || (hasStatus && status === 0) || /failed to fetch|network request failed|load failed|networkerror|fetch failed/.test(message)) return 'network';
  if (status === 401 || /jwt|token.*expired|session.*expired|pgrst301/.test(`${code} ${message}`)) return 'session';
  if (status === 403 || code === '42501' || /row-level security|permission denied|not authorized|forbidden/.test(message)) return 'access';
  if (status === 409 || ['23503', '23505', '409'].includes(code)) return 'conflict';
  if (status === 429 || code === '429' || /rate.?limit|too many requests/.test(message)) return 'rate-limit';

  if (details.code !== undefined || details.status !== undefined || details.statusCode !== undefined) return 'unknown';
  if (/bearer\s|password|credential|service[_ -]?role|[?&](token|signature)=|\/storage\/v1\/|postgres|postgrest|sqlstate/i.test(message)) return 'unknown';
  return null;
}

export function sanitizeServiceError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === userSafeErrorName) return error;
    const existingCategory = error.name.startsWith(serviceErrorPrefix)
      ? error.name.slice(serviceErrorPrefix.length) as ServiceErrorCategory
      : null;
    if (existingCategory && serviceErrorCategories.has(existingCategory)) return error;
  }
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

function operationForArea(areaName: string): ClientErrorOperation {
  if (areaName === 'auth') return 'auth';
  if (areaName === 'media') return 'media';
  return 'data';
}

function sanitizeAndReport(error: unknown, areaName: string, report?: ServiceErrorTelemetry) {
  if (!(error instanceof Error && error.name === userSafeErrorName)) {
    const candidateCategory = error instanceof Error && error.name.startsWith(serviceErrorPrefix)
      ? error.name.slice(serviceErrorPrefix.length) as ServiceErrorCategory
      : null;
    const safeCategory = candidateCategory && serviceErrorCategories.has(candidateCategory)
      ? candidateCategory
      : categoryForError(error) ?? 'unknown';
    report?.({ operation: operationForArea(areaName), category: safeCategory });
  }
  return sanitizeServiceError(error);
}

export function withSafeServiceErrors<T extends object>(service: T, report?: ServiceErrorTelemetry): T {
  return Object.fromEntries(Object.entries(service).map(([areaName, area]) => {
    if (!area || typeof area !== 'object') return [areaName, area];
    const wrappedArea = Object.fromEntries(Object.entries(area).map(([methodName, method]) => {
      if (typeof method !== 'function') return [methodName, method];
      return [methodName, (...args: unknown[]) => {
        try {
          const result = method(...args);
          return isPromiseLike(result) ? result.catch((error) => { throw sanitizeAndReport(error, areaName, report); }) : result;
        } catch (error) {
          throw sanitizeAndReport(error, areaName, report);
        }
      }];
    }));
    return [areaName, wrappedArea];
  })) as T;
}
