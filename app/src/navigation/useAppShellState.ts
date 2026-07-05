import { useMemo, useState } from 'react';

export const tabs = ['Home', 'Calendar', 'Create', 'Memories', 'Groups'] as const;
export type AppTab = (typeof tabs)[number];
export type AppSurface = AppTab | 'EventDetail';

export function useAppShellState() {
  const [activeSurface, setActiveSurface] = useState<AppSurface>('Home');
  const activeTab = tabs.includes(activeSurface as AppTab) ? activeSurface as AppTab : 'Home';

  const tabItems = useMemo(
    () => tabs.map((tab) => ({ label: tab, active: tab === activeTab })),
    [activeTab],
  );

  const setActiveTab = (tab: AppTab) => setActiveSurface(tab);
  const openEventDetail = () => setActiveSurface('EventDetail');

  return {
    tabs,
    tabItems,
    activeTab,
    activeSurface,
    setActiveTab,
    openEventDetail,
  } as const;
}
