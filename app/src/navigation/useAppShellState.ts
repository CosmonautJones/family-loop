export function useAppShellState() {
  return {
    tabs: ['Home', 'Calendar', 'Create', 'Memories', 'Profile'],
    activeTab: 'Home',
  } as const;
}
