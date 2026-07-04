import { useMemo, useState } from 'react';

import { appSections, type AppSectionKey } from '../data/sampleData';

export function useAppShellState(initialSection: AppSectionKey = 'home') {
  const [activeSection, setActiveSection] = useState<AppSectionKey>(initialSection);

  const sections = useMemo(
    () => appSections.map((section) => ({ ...section, isActive: section.key === activeSection })),
    [activeSection],
  );

  return {
    activeSection,
    sections,
    setActiveSection,
  };
}
