import type { LoopedInService } from './api';
import { createMockLoopedInService } from './mockAdapter';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';

export const durableDatabaseKey = 'loopedin:local-database:v1';
export const durableDatabaseVersion = 1;

type DurableDatabaseEnvelope = {
  version: typeof durableDatabaseVersion;
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

export function createDurableLocalLoopedInService(
  storage: AsyncKeyValueStorage,
  seedFactory: () => MockDatabase = createMockDatabase,
): DurableLocalService {
  let service: LoopedInService;
  let committed: MockDatabase | null = null;
  let writeQueue = Promise.resolve();

  const persist = (database: MockDatabase) => {
    const serialized = JSON.stringify({ version: durableDatabaseVersion, database } satisfies DurableDatabaseEnvelope);
    const write = writeQueue.catch(() => undefined).then(() => storage.setItem(durableDatabaseKey, serialized));
    writeQueue = write;
    return write.then(
      () => { committed = cloneDatabase(database); },
      (error) => {
        if (committed) build(committed);
        throw error;
      },
    );
  };

  const build = (database: MockDatabase) => {
    service = createMockLoopedInService(database, { onChange: persist });
  };

  const collectionKeys: (keyof MockDatabase)[] = ['groups', 'events', 'rsvps', 'activity', 'messages', 'memories', 'media', 'notifications'];
  let ready = storage.getItem(durableDatabaseKey).then((raw) => {
    if (raw === null) {
      const seed = seedFactory();
      const serialized = JSON.stringify({ version: durableDatabaseVersion, database: seed } satisfies DurableDatabaseEnvelope);
      return storage.setItem(durableDatabaseKey, serialized).then(() => {
        committed = cloneDatabase(seed);
        build(seed);
      });
    }
    const parsed = JSON.parse(raw) as Partial<DurableDatabaseEnvelope>;
    if (parsed.version !== durableDatabaseVersion) throw new Error(`Unsupported local database version: ${String(parsed.version)}`);
    if (!parsed.database || collectionKeys.some((key) => !Array.isArray(parsed.database?.[key]))) {
      throw new Error('Malformed local database payload. Reset and reseed to recover.');
    }
    committed = cloneDatabase(parsed.database);
    build(parsed.database);
  });

  const section = <K extends keyof LoopedInService>(name: K): LoopedInService[K] => new Proxy({} as LoopedInService[K], {
    get: (_target, property) => {
      if (name === 'auth' && property === 'onAuthStateChange') return () => () => undefined;
      return (...args: unknown[]) => ready.then(() => {
        const method = service[name][property as keyof LoopedInService[K]] as (...values: unknown[]) => unknown;
        return method(...args);
      });
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
      const previousReady = ready;
      const previousWrites = writeQueue;
      const seed = cloneDatabase(seedFactory());
      const serialized = JSON.stringify({ version: durableDatabaseVersion, database: seed } satisfies DurableDatabaseEnvelope);
      const recovery = Promise.allSettled([previousReady, previousWrites])
        .then(() => storage.setItem(durableDatabaseKey, serialized))
        .then(() => {
          committed = cloneDatabase(seed);
          build(seed);
        });
      ready = recovery;
      writeQueue = recovery;
      await recovery;
    },
  };
}
