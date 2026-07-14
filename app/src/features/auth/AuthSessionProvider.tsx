import { useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGroupsQuery } from '../../app/queries';
import { isServiceConfigured, loopedInService } from '../../services';
import type { AuthSession } from '../../services/api';
import type { GroupMember } from '../../types/domain';
import { useLoopedInStore } from '../../store/useLoopedInStore';
import { parseInvitationToken, withoutInvitationRoute } from './invitationRoute';

type SessionStatus = 'restoring' | 'signedOut' | 'authenticated' | 'error';

type AuthSessionContextValue = {
  configured: boolean;
  error: string | null;
  groupError: string | null;
  groups: { id: string }[] | undefined;
  groupsPending: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  confirmationRequired: boolean;
  invitationToken: string | null;
  setInvitationToken: (token: string) => void;
  clearInvitationToken: () => void;
  localProfiles: GroupMember[];
  chooseLocalProfile: (personId: string) => Promise<void>;
  logout: () => Promise<void>;
  pending: boolean;
  session: AuthSession | null;
  status: SessionStatus;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const setActiveGroupId = useLoopedInStore((state) => state.setActiveGroupId);
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localProfiles, setLocalProfiles] = useState<GroupMember[]>([]);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [invitationToken, setInvitationTokenState] = useState(() => typeof window === 'undefined' ? null : parseInvitationToken(window.location.hash));
  const previousUserId = useRef<string | null | undefined>(undefined);
  const groupsQuery = useGroupsQuery(status === 'authenticated');

  useEffect(() => {
    if (typeof window === 'undefined' || !invitationToken) return;
    const nextHash = withoutInvitationRoute(window.location.hash);
    if (nextHash !== window.location.hash) window.history.replaceState(window.history.state, '', nextHash);
  }, [invitationToken]);

  const applySession = useCallback((nextSession: AuthSession | null) => {
    if (previousUserId.current !== undefined && previousUserId.current !== nextSession?.userId) {
      queryClient.clear();
      setActiveGroupId('');
    }
    previousUserId.current = nextSession?.userId ?? null;
    setSession(nextSession);
    setError(null);
    setStatus(nextSession ? 'authenticated' : 'signedOut');
  }, [queryClient, setActiveGroupId]);

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
    if (isServiceConfigured) return;
    loopedInService.auth.listLocalProfiles()
      .then(setLocalProfiles)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load local profiles.'));
  }, []);

  useEffect(() => {
    if (groupsQuery.data === undefined) return;
    setActiveGroupId(groupsQuery.data.some((group) => group.id === activeGroupId) ? activeGroupId : groupsQuery.data[0]?.id ?? '');
  }, [activeGroupId, groupsQuery.data, setActiveGroupId]);

  const login = useCallback(async (email: string, password: string) => {
    setPending(true);
    setError(null);
    setConfirmationRequired(false);
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

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    setPending(true);
    setError(null);
    setConfirmationRequired(false);
    try {
      const result = await loopedInService.auth.signUp(displayName, email, password);
      if (result.status === 'authenticated') applySession(result.session);
      else setConfirmationRequired(true);
    } catch (cause: unknown) {
      setSession(null);
      setError(cause instanceof Error ? cause.message : 'Unable to create your account.');
      setStatus('signedOut');
    } finally {
      setPending(false);
    }
  }, [applySession]);

  const setInvitationToken = useCallback((token: string) => {
    setInvitationTokenState(token);
  }, []);

  const clearInvitationToken = useCallback(() => {
    setInvitationTokenState(null);
  }, []);

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

  const chooseLocalProfile = useCallback(async (personId: string) => {
    setPending(true);
    setError(null);
    try {
      applySession(await loopedInService.auth.chooseLocalProfile(personId));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to open that local profile.');
    } finally {
      setPending(false);
    }
  }, [applySession]);

  return (
    <AuthSessionContext.Provider value={{
      configured: isServiceConfigured,
      confirmationRequired,
      invitationToken,
      setInvitationToken,
      clearInvitationToken,
      error,
      groupError: groupsQuery.error instanceof Error ? groupsQuery.error.message : null,
      groups: groupsQuery.data,
      groupsPending: groupsQuery.isPending,
      localProfiles,
      chooseLocalProfile,
      login,
      signUp,
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
