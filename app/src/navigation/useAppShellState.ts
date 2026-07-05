import { useMemo, useState } from 'react';

export const tabs = ['Home', 'Calendar', 'Create', 'Memories', 'Groups'] as const;
export type AppTab = (typeof tabs)[number];
export type AppSurface = AppTab | 'EventDetail';

export function useAppShellState() {
  const [activeSurface, setActiveSurface] = useState<AppSurface>('Home');
  const [returnTab, setReturnTab] = useState<AppTab>('Home');
  const activeTab = tabs.includes(activeSurface as AppTab) ? activeSurface as AppTab : returnTab;

  const tabItems = useMemo(
    () => tabs.map((tab) => ({ label: tab, active: tab === activeTab })),
    [activeTab],
  );

  const setActiveTab = (tab: AppTab) => {
    setReturnTab(tab);
    setActiveSurface(tab);
  };
  const openEventDetail = (sourceTab: AppTab = activeTab) => {
    setReturnTab(sourceTab);
    setActiveSurface('EventDetail');
  };
  const closeEventDetail = () => setActiveSurface(returnTab);

  return {
    tabs,
    tabItems,
    activeTab,
    activeSurface,
    setActiveTab,
    openEventDetail,
    closeEventDetail,
  } as const;
}
