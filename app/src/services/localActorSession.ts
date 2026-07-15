export const localActorSessionKey = 'loopedin:local-actor:v1';

export interface LocalActorSessionStore {
  getActorId(): string | null;
  setActorId(actorId: string | null): void;
}

export function createMemoryActorSessionStore(initialActorId: string | null = 'person-you'): LocalActorSessionStore {
  let actorId = initialActorId;
  return {
    getActorId: () => actorId,
    setActorId: (nextActorId) => { actorId = nextActorId; },
  };
}

export const browserActorSessionStore: LocalActorSessionStore = {
  getActorId() {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(localActorSessionKey);
  },
  setActorId(actorId) {
    if (typeof sessionStorage === 'undefined') return;
    if (actorId) sessionStorage.setItem(localActorSessionKey, actorId);
    else sessionStorage.removeItem(localActorSessionKey);
  },
};
