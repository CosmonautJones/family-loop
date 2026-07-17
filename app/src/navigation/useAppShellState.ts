import { useEffect, useMemo, useState } from 'react';
import { appTabs as tabs, navTabs, formatAppRoute, parseAppRoute, type AppRoute, type AppTab } from '../app/selectors';

export { formatAppRoute, parseAppRoute } from '../app/selectors';
export type { AppRoute, AppTab } from '../app/selectors';
export type AppSurface = AppTab | 'EventDetail';

type LoopedInHistoryState = { loopedIn?: true; canGoBack?: boolean };

function currentRoute(): AppRoute {
  if (typeof window === 'undefined') return { surface: 'Home' };
  return parseAppRoute(window.location.hash);
}

export function useAppShellState() {
  const [route, setRoute] = useState<AppRoute>(currentRoute);
  const activeSurface = route.surface;
  const returnTab = route.surface === 'EventDetail' ? route.returnTab : route.surface;
  const activeTab = returnTab;
  const activeEventId = route.surface === 'EventDetail' ? route.eventId : undefined;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    const historyState = window.history.state as LoopedInHistoryState | null;
    if (!historyState?.loopedIn) {
      window.history.replaceState({ loopedIn: true, canGoBack: false }, '', window.location.hash || formatAppRoute(currentRoute()));
    }
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const navigate = (nextRoute: AppRoute, replace = false) => {
    setRoute(nextRoute);
    if (typeof window === 'undefined') return;
    const hash = formatAppRoute(nextRoute);
    if (replace) window.history.replaceState({ loopedIn: true, canGoBack: false }, '', hash);
    else if (window.location.hash !== hash) window.history.pushState({ loopedIn: true, canGoBack: true }, '', hash);
  };

  const tabItems = useMemo(
    () => navTabs.map((tab) => ({ label: tab, active: tab === activeTab })),
    [activeTab],
  );

  const setActiveTab = (tab: AppTab) => navigate({ surface: tab });
  const openEventDetail = (sourceTab: AppTab = activeTab, eventId?: string) => {
    if (!eventId) return;
    navigate({ surface: 'EventDetail', eventId, returnTab: sourceTab });
  };
  const closeEventDetail = () => {
    const historyState = typeof window === 'undefined' ? null : window.history.state as LoopedInHistoryState | null;
    if (historyState?.loopedIn && historyState.canGoBack) {
      window.history.back();
      return;
    }
    navigate({ surface: returnTab }, true);
  };

  return { tabs, tabItems, activeTab, activeSurface, activeEventId, setActiveTab, openEventDetail, closeEventDetail } as const;
}
