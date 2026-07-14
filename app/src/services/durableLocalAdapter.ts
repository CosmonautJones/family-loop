import type { LoopedInService } from './api';
import { createMockLoopedInService } from './mockAdapter';
import { cloneDatabase, createMockDatabase, type MockDatabase } from './mockData';
import { createMemoryActorSessionStore, type LocalActorSessionStore } from './localActorSession';

export const durableDatabaseKey = 'loopedin:local-database:v1';
export const durableDatabaseVersion = 7;

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

function parseEnvelope(raw: string): { envelope: DurableDatabaseEnvelope; migrated: boolean } {
  const parsed = JSON.parse(raw) as { version?: number; revision?: number; database?: MockDatabase };
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4 && parsed.version !== 5 && parsed.version !== 6 && parsed.version !== durableDatabaseVersion) throw new Error(`Unsupported local database version: ${String(parsed.version)}`);
  if (!parsed.database || collectionKeys.some((key) => !Array.isArray(parsed.database?.[key]))) {
    throw new Error('Malformed local database payload. Reset and reseed to recover.');
  }
  if (parsed.version === durableDatabaseVersion && !Array.isArray(parsed.database.reminders)) {
    throw new Error('Malformed local database payload. Reset and reseed to recover.');
  }
  if (parsed.revision !== undefined && (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0)) {
    throw new Error('Malformed local database revision. Reset and reseed to recover.');
  }
  const database = cloneDatabase(parsed.database);
  database.reminders = Array.isArray(database.reminders) ? database.reminders : [];
  if (parsed.version === 1) {
    database.groups = database.groups.map((group) => ({
      ...group,
      members: group.members?.map((member) => ({
        ...member,
        role: member.role ?? (group.id === 'group-jones-family' && member.id === 'person-you' ? 'owner' : 'member'),
      })),
    }));
  } else if (database.groups.some((group) => group.members?.some((member) => !['owner', 'admin', 'member'].includes(member.role)))) {
    throw new Error('Malformed local group member role. Reset and reseed to recover.');
  }
  database.media = database.media.map((item) => ({
    ...item,
    altText: item.altText?.trim() || item.caption?.trim() || 'Shared family photo',
  }));
  database.messages = database.messages.map((message) => {
    const knownAuthor = database.groups.flatMap((group) => group.members ?? []).find((member) => member.id === message.author?.id || member.name === message.authorName);
    return {
      ...message,
      authorId: message.authorId || knownAuthor?.id || `legacy-author:${message.authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    };
  });
  database.events = database.events.map((event) => {
    const group = database.groups.find((item) => item.id === event.groupId);
    const defaultCreator = group?.members?.find((member) => member.role === 'owner') ?? group?.members?.[0];
    return { ...event, creatorId: event.creatorId || defaultCreator?.id || 'legacy-creator' };
  });
  database.notifications = database.notifications.flatMap((notification) => {
    if (notification.userId) return [notification];
    const groupId = notification.groupId ?? database.events.find((event) => event.id === notification.eventId)?.groupId;
    const members = database.groups.find((group) => group.id === groupId)?.members ?? [];
    if (!members.length) return [{ ...notification, userId: 'legacy-recipient' }];
    return members.map((member, index) => ({
      ...notification,
      id: index === 0 ? notification.id : `${notification.id}:${member.id}`,
      userId: member.id,
    }));
  });
  return {
    envelope: { version: durableDatabaseVersion, revision: parsed.revision ?? 0, database },
    migrated: parsed.version !== durableDatabaseVersion,
  };
}

export function createDurableLocalLoopedInService(
  storage: AsyncKeyValueStorage,
  seedFactory: () => MockDatabase = createMockDatabase,
  actorSession: LocalActorSessionStore = createMemoryActorSessionStore(),
): DurableLocalService {
  let service: LoopedInService;
  let committed: DurableDatabaseEnvelope | null = null;

  const build = (envelope: DurableDatabaseEnvelope) => {
    committed = { ...envelope, database: cloneDatabase(envelope.database) };
    service = createMockLoopedInService(envelope.database, { actorSession });
  };

  const load = async () => {
    const raw = await storage.getItem(durableDatabaseKey);
    if (raw !== null) {
      const parsed = parseEnvelope(raw);
      if (parsed.migrated) await storage.setItem(durableDatabaseKey, JSON.stringify(parsed.envelope));
      return parsed.envelope;
    }
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
    reminders: new Set(['enablePreference', 'disablePreference']),
  };

  const mutate = async <K extends keyof LoopedInService>(name: K, property: string, args: unknown[], invocationActor: LocalActorSessionStore) => {
    await ready;
    return withStorageLock(async () => {
      const latest = await load();
      let nextDatabase: MockDatabase | null = null;
      const latestService = createMockLoopedInService(latest.database, {
        actorSession: invocationActor,
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
      if (name === 'thread' && property === 'subscribeMessages') return () => () => undefined;
      return (...args: unknown[]) => {
        const propertyName = String(property);
        const invocationActor = createMemoryActorSessionStore(actorSession.getActorId());
        if (mutations[name]?.has(propertyName)) return mutate(name, propertyName, args, invocationActor);
        return ready.then(() => withStorageLock(async () => {
          const latest = await load();
          if (!committed || latest.revision !== committed.revision) build(latest);
          const invocationService = name === 'auth' ? service : createMockLoopedInService(latest.database, { actorSession: invocationActor });
          const method = invocationService[name][property as keyof LoopedInService[K]] as (...values: unknown[]) => unknown;
          return method(...args);
        }));
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
    reminders: section('reminders'),
    resetAndReseed: async () => {
      const recovery = ready.catch(() => undefined).then(() => withStorageLock(async () => {
        const previous = committed;
        try {
          const raw = await storage.getItem(durableDatabaseKey);
          let revision = -1;
          if (raw !== null) {
            try { revision = parseEnvelope(raw).envelope.revision; } catch { /* Explicit recovery may replace corrupt storage. */ }
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
