import { useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGroupsQuery } from '../../app/queries';
import { isServiceConfigured, loopedInService } from '../../services';
import type { AuthSession } from '../../services/api';
import { useLoopedInStore } from '../../store/useLoopedInStore';

type SessionStatus = 'restoring' | 'signedOut' | 'authenticated' | 'error';

type AuthSessionContextValue = {
  configured: boolean;
  error: string | null;
  groupError: string | null;
  groups: { id: string }[] | undefined;
  groupsPending: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  pending: boolean;
  session: AuthSession | null;
  status: SessionStatus;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const setActiveGroupId = useLoopedInStore((state) => state.setActiveGroupId);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const previousUserId = useRef<string | null | undefined>(undefined);
  const groupsQuery = useGroupsQuery(isServiceConfigured && status === 'authenticated');

  const applySession = useCallback((nextSession: AuthSession | null) => {
    if (previousUserId.current !== undefined && previousUserId.current !== nextSession?.userId) {
      queryClient.clear();
    }
    previousUserId.current = nextSession?.userId ?? null;
    setSession(nextSession);
    setError(null);
    setStatus(nextSession ? 'authenticated' : 'signedOut');
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    const unsubscribe = loopedInService.auth.onAuthStateChange((nextSession) => {
      if (active) applySession(nextSession);
    });

    loopedInService.auth.getSession()
      .then((nextSession) => {
        if (active) applySession(nextSession);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setSession(null);
        setError(cause instanceof Error ? cause.message : 'Unable to restore your session.');
        setStatus('error');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!isServiceConfigured || groupsQuery.data === undefined) return;
    setActiveGroupId(groupsQuery.data[0]?.id ?? '');
  }, [groupsQuery.data, setActiveGroupId]);

  const login = useCallback(async (email: string, password: string) => {
    setPending(true);
    setError(null);
    try {
      applySession(await loopedInService.auth.login(email, password));
    } catch (cause: unknown) {
      setSession(null);
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
      setStatus('signedOut');
    } finally {
      setPending(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await loopedInService.auth.logout();
      applySession(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out.');
    } finally {
      setPending(false);
    }
  }, [applySession]);

  return (
    <AuthSessionContext.Provider value={{
      configured: isServiceConfigured,
      error,
      groupError: groupsQuery.error instanceof Error ? groupsQuery.error.message : null,
      groups: groupsQuery.data,
      groupsPending: groupsQuery.isPending,
      login,
      logout,
      pending,
      session,
      status,
    }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error('useAuthSession must be used within AuthSessionProvider.');
  return value;
}
