import type { QueryClient } from '@tanstack/react-query';

const protectedQueryRoots = new Set(['groups', 'event', 'events', 'rsvps', 'messages', 'media', 'notifications', 'reminder', 'profiles', 'invitation']);

export function evictProtectedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => {
    const [root] = query.queryKey;
    return protectedQueryRoots.has(String(root));
  } });
}
