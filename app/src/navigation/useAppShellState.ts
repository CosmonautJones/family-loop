import { useMemo, useState } from 'react';

export const tabs = ['Home', 'Calendar', 'Create', 'Memories', 'Groups'] as const;
export type AppTab = (typeof tabs)[number];

export function useAppShellState() {
  const [activeTab, setActiveTab] = useState<AppTab>('Home');

  const tabItems = useMemo(
    () => tabs.map((tab) => ({ label: tab, active: tab === activeTab })),
    [activeTab],
  );

  return {
    tabs,
    tabItems,
    activeTab,
    setActiveTab,
  } as const;
}
