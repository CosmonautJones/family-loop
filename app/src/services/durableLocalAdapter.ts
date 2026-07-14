import type { LoopedInService } from './api';
import { createMockLoopedInService } from './mockAdapter';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';

export const durableDatabaseKey = 'loopedin:local-database:v1';
export const durableDatabaseVersion = 1;

type DurableDatabaseEnvelope = {
  version: typeof durableDatabaseVersion;
  revision: number;
  database: MockDatabase;
};

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface DurableLocalService extends LoopedInService {
  resetAndReseed(): Promise<void>;
}

const collectionKeys: (keyof MockDatabase)[] = ['groups', 'events', 'rsvps', 'activity', 'messages', 'memories', 'media', 'notifications'];
const fallbackLocks = new Map<string, Promise<void>>();

function withFallbackLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const previous = fallbackLocks.get(name) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const tail = result.then(() => undefined, () => undefined);
  fallbackLocks.set(name, tail);
  return result.finally(() => {
    if (fallbackLocks.get(name) === tail) fallbackLocks.delete(name);
  });
}

function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const locks = (globalThis as { navigator?: { locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> } } }).navigator?.locks;
  if (locks?.request) return locks.request(durableDatabaseKey, operation);
  return withFallbackLock(durableDatabaseKey, operation);
}

function parseEnvelope(raw: string): DurableDatabaseEnvelope {
  const parsed = JSON.parse(raw) as Partial<DurableDatabaseEnvelope>;
  if (parsed.version !== durableDatabaseVersion) throw new Error(`Unsupported local database version: ${String(parsed.version)}`);
  if (!parsed.database || collectionKeys.some((key) => !Array.isArray(parsed.database?.[key]))) {
    throw new Error('Malformed local database payload. Reset and reseed to recover.');
  }
  if (parsed.revision !== undefined && (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0)) {
    throw new Error('Malformed local database revision. Reset and reseed to recover.');
  }
  return { version: durableDatabaseVersion, revision: parsed.revision ?? 0, database: parsed.database };
}

export function createDurableLocalLoopedInService(
  storage: AsyncKeyValueStorage,
  seedFactory: () => MockDatabase = createMockDatabase,
): DurableLocalService {
  let service: LoopedInService;
  let committed: DurableDatabaseEnvelope | null = null;

  const build = (envelope: DurableDatabaseEnvelope) => {
    committed = { ...envelope, database: cloneDatabase(envelope.database) };
    service = createMockLoopedInService(envelope.database);
  };

  const load = async () => {
    const raw = await storage.getItem(durableDatabaseKey);
    if (raw !== null) return parseEnvelope(raw);
    const envelope: DurableDatabaseEnvelope = { version: durableDatabaseVersion, revision: 0, database: cloneDatabase(seedFactory()) };
    const serialized = JSON.stringify(envelope);
    await storage.setItem(durableDatabaseKey, serialized);
    return envelope;
  };

  let ready = withStorageLock(async () => {
    const envelope = await load();
    build(envelope);
  });

  const mutations: Partial<Record<keyof LoopedInService, Set<string>>> = {
    groups: new Set(['createGroup', 'updateGroup', 'deleteGroup']),
    events: new Set(['createEvent', 'updateEvent', 'deleteEvent']),
    rsvps: new Set(['upsertRsvp', 'updateRsvp', 'deleteRsvp']),
    thread: new Set(['sendMessage']),
    media: new Set(['uploadMedia', 'deleteMedia']),
    notifications: new Set(['markRead', 'clearAll']),
  };

  const mutate = async <K extends keyof LoopedInService>(name: K, property: string, args: unknown[]) => {
    await ready;
    return withStorageLock(async () => {
      const latest = await load();
      let nextDatabase: MockDatabase | null = null;
      const latestService = createMockLoopedInService(latest.database, {
        onChange: async (database) => { nextDatabase = database; },
      });
      const method = latestService[name][property as keyof LoopedInService[K]] as (...values: unknown[]) => Promise<unknown>;
      const result = await method(...args);
      if (!nextDatabase) throw new Error(`Local mutation ${String(name)}.${property} did not produce a database update.`);
      const next: DurableDatabaseEnvelope = {
        version: durableDatabaseVersion,
        revision: latest.revision + 1,
        database: nextDatabase,
      };
      const serialized = JSON.stringify(next);
      await storage.setItem(durableDatabaseKey, serialized);
      build(next);
      return result;
    });
  };

  const section = <K extends keyof LoopedInService>(name: K): LoopedInService[K] => new Proxy({} as LoopedInService[K], {
    get: (_target, property) => {
      if (name === 'auth' && property === 'onAuthStateChange') return () => () => undefined;
      return (...args: unknown[]) => {
        const propertyName = String(property);
        if (mutations[name]?.has(propertyName)) return mutate(name, propertyName, args);
        return ready.then(() => {
          const method = service[name][property as keyof LoopedInService[K]] as (...values: unknown[]) => unknown;
          return method(...args);
        });
      };
    },
  });

  return {
    auth: section('auth'),
    groups: section('groups'),
    events: section('events'),
    rsvps: section('rsvps'),
    activity: section('activity'),
    thread: section('thread'),
    media: section('media'),
    notifications: section('notifications'),
    resetAndReseed: async () => {
      const recovery = ready.catch(() => undefined).then(() => withStorageLock(async () => {
        const previous = committed;
        try {
          const raw = await storage.getItem(durableDatabaseKey);
          let revision = -1;
          if (raw !== null) {
            try { revision = parseEnvelope(raw).revision; } catch { /* Explicit recovery may replace corrupt storage. */ }
          }
          const next: DurableDatabaseEnvelope = {
            version: durableDatabaseVersion,
            revision: revision + 1,
            database: cloneDatabase(seedFactory()),
          };
          const serialized = JSON.stringify(next);
          await storage.setItem(durableDatabaseKey, serialized);
          build(next);
        } catch (error) {
          if (previous) build(previous);
          throw error;
        }
      }));
      ready = recovery;
      await recovery;
    },
  };
}
