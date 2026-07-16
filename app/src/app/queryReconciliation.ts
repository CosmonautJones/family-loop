import type { QueryClient, QueryKey } from '@tanstack/react-query';

export async function refetchActiveQueryAfterInFlight(queryClient: QueryClient, queryKey: QueryKey) {
  await queryClient.cancelQueries({ queryKey, exact: true });
  await queryClient.refetchQueries({ queryKey, exact: true, type: 'active' });
}
