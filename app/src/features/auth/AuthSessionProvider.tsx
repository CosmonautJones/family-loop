import { useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAccountDeletionStatusQuery, useGroupsQuery } from '../../app/queries';
import { evictProtectedQueries } from '../../app/protectedQueries';
import { isServiceConfigured, loopedInService } from '../../services';
import type { AccountDeletionStatus, AuthSession } from '../../services/api';
import { hasPasswordRecoveryCallback } from '../../services/supabaseClient';
import type { GroupMember } from '../../types/domain';
import { useLoopedInStore } from '../../store/useLoopedInStore';
import { createLatestResolutionGuard, formatInvitationRoute, parseInvitationToken, withoutInvitationRoute } from './invitationRoute';

type SessionStatus = 'restoring' | 'signedOut' | 'authenticated' | 'error';
type RecoveryStatus = 'idle' | 'loading' | 'requested' | 'ready' | 'complete' | 'invalid';

type AuthSessionContextValue = {
  configured: boolean;
  deletionStatus: AccountDeletionStatus | null;
  deletionStatusError: string | null;
  deletionStatusPending: boolean;
  error: string | null;
  groupError: string | null;
  groups: { id: string }[] | undefined;
  groupsPending: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUpWithInvitation: (displayName: string, email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  clearRecovery: () => void;
  recoveryStatus: RecoveryStatus;
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
  const configured = isServiceConfigured();
  const queryClient = useQueryClient();
  const setActiveGroupId = useLoopedInStore((state) => state.setActiveGroupId);
  const activeGroupId = useLoopedInStore((state) => state.activeGroupId);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localProfiles, setLocalProfiles] = useState<GroupMember[]>([]);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const recoveryCallback = useRef(hasPasswordRecoveryCallback);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>(recoveryCallback.current ? 'loading' : 'idle');
  const [invitationToken, setInvitationTokenState] = useState(() => typeof window === 'undefined' ? null : parseInvitationToken(window.location.hash));
  const previousUserId = useRef<string | null | undefined>(undefined);
  const sessionResolution = useRef(createLatestResolutionGuard());
  const operationResolution = useRef(createLatestResolutionGuard());
  const deletionStatusQuery = useAccountDeletionStatusQuery(configured && status === 'authenticated');
  const deletionStatusResolved = !configured || status !== 'authenticated' || deletionStatusQuery.isSuccess;
  const groupsQuery = useGroupsQuery(status === 'authenticated' && deletionStatusResolved && !deletionStatusQuery.data);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncInvitationRoute = () => {
      const token = parseInvitationToken(window.location.hash);
      if (token) setInvitationTokenState(token);
    };
    window.addEventListener('hashchange', syncInvitationRoute);
    return () => window.removeEventListener('hashchange', syncInvitationRoute);
  }, []);

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
    const restoreIsCurrent = sessionResolution.current.begin();
    const unsubscribe = loopedInService.auth.onAuthStateChange((nextSession, passwordRecovery) => {
      const eventIsCurrent = sessionResolution.current.begin();
      if (active && eventIsCurrent()) {
        if (passwordRecovery) setRecoveryStatus('ready');
        else if (recoveryCallback.current && !nextSession) setRecoveryStatus('invalid');
        applySession(nextSession);
      }
    });

    loopedInService.auth.getSession()
      .then((nextSession) => {
        if (active && restoreIsCurrent()) {
          if (recoveryCallback.current) setRecoveryStatus(nextSession ? 'ready' : 'invalid');
          applySession(nextSession);
        }
      })
      .catch((cause: unknown) => {
        if (!active || !restoreIsCurrent()) return;
        setSession(null);
        if (recoveryCallback.current) {
          setRecoveryStatus('invalid');
          setError(null);
          setStatus('signedOut');
        } else {
          setError(cause instanceof Error ? cause.message : 'Unable to restore your session.');
          setStatus('error');
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (configured) return;
    loopedInService.auth.listLocalProfiles()
      .then(setLocalProfiles)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load local profiles.'));
  }, [configured]);

  useEffect(() => {
    if (!deletionStatusQuery.data && !deletionStatusQuery.isError) return;
    void queryClient.cancelQueries();
    evictProtectedQueries(queryClient);
    setActiveGroupId('');
  }, [deletionStatusQuery.data, deletionStatusQuery.isError, queryClient, setActiveGroupId]);

  useEffect(() => {
    if (groupsQuery.data === undefined) return;
    const nextActiveGroupId = groupsQuery.data.some((group) => group.id === activeGroupId) ? activeGroupId : groupsQuery.data[0]?.id ?? '';
    if (nextActiveGroupId === activeGroupId) return;
    evictProtectedQueries(queryClient);
    setActiveGroupId(nextActiveGroupId);
  }, [activeGroupId, groupsQuery.data, queryClient, setActiveGroupId]);

  const login = useCallback(async (email: string, password: string) => {
    const operationIsCurrent = operationResolution.current.begin();
    const isCurrent = sessionResolution.current.begin();
    setPending(true);
    setError(null);
    setConfirmationRequired(false);
    try {
      const nextSession = await loopedInService.auth.login(email, password);
      if (isCurrent()) applySession(nextSession);
    } catch (cause: unknown) {
      if (!isCurrent()) return;
      setSession(null);
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
      setStatus('signedOut');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, [applySession]);

  const signUpWithInvitation = useCallback(async (displayName: string, email: string, password: string) => {
    const operationIsCurrent = operationResolution.current.begin();
    const isCurrent = sessionResolution.current.begin();
    setPending(true);
    setError(null);
    setConfirmationRequired(false);
    try {
      if (!invitationToken) throw new Error('This invitation can’t be used. Ask the person who invited you for a new link.');
      const result = await loopedInService.auth.signUp(invitationToken, displayName, email, password);
      if (!isCurrent()) return;
      if (result.status === 'authenticated') applySession(result.session);
      else if (result.status === 'confirmationOrSignInRequired') setConfirmationRequired(true);
    } catch (cause: unknown) {
      if (!isCurrent()) return;
      setSession(null);
      setError(cause instanceof Error ? cause.message : 'Unable to create your account.');
      setStatus('signedOut');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, [applySession, invitationToken]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const operationIsCurrent = operationResolution.current.begin();
    setPending(true);
    setError(null);
    try {
      const redirect = new URL(window.location.href);
      redirect.search = '';
      redirect.hash = '';
      await loopedInService.auth.requestPasswordReset(email, redirect.toString());
      setRecoveryStatus('requested');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t request a reset link. Try again.');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const operationIsCurrent = operationResolution.current.begin();
    setPending(true);
    setError(null);
    try {
      await loopedInService.auth.updatePassword(password);
      setRecoveryStatus('complete');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t replace your password. Try again.');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, []);

  const clearRecovery = useCallback(() => {
    recoveryCallback.current = false;
    setRecoveryStatus('idle');
    setError(null);
    if (typeof window !== 'undefined') window.history.replaceState(window.history.state, '', `${window.location.pathname}#/home`);
  }, []);

  const setInvitationToken = useCallback((token: string) => {
    const route = formatInvitationRoute(token);
    setInvitationTokenState(token);
    if (typeof window !== 'undefined' && window.location.hash !== route) window.history.replaceState(window.history.state, '', route);
  }, []);

  const clearInvitationToken = useCallback(() => {
    setInvitationTokenState(null);
    queryClient.removeQueries({ queryKey: ['invitation', 'current-preview'] });
    if (typeof window !== 'undefined') {
      const nextHash = withoutInvitationRoute(window.location.hash);
      if (nextHash !== window.location.hash) window.history.replaceState(window.history.state, '', nextHash);
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    const operationIsCurrent = operationResolution.current.begin();
    const isCurrent = sessionResolution.current.begin();
    setPending(true);
    setError(null);
    try {
      await loopedInService.auth.logout();
      if (isCurrent()) applySession(null);
    } catch (cause: unknown) {
      if (!isCurrent()) return;
      setError(cause instanceof Error ? cause.message : 'Unable to sign out.');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, [applySession]);

  const chooseLocalProfile = useCallback(async (personId: string) => {
    const operationIsCurrent = operationResolution.current.begin();
    const isCurrent = sessionResolution.current.begin();
    setPending(true);
    setError(null);
    try {
      const nextSession = await loopedInService.auth.chooseLocalProfile(personId);
      if (isCurrent()) applySession(nextSession);
    } catch (cause: unknown) {
      if (!isCurrent()) return;
      setError(cause instanceof Error ? cause.message : 'Unable to open that local profile.');
    } finally {
      if (operationIsCurrent()) setPending(false);
    }
  }, [applySession]);

  return (
    <AuthSessionContext.Provider value={{
      configured,
      deletionStatus: deletionStatusQuery.data ?? null,
      deletionStatusError: deletionStatusQuery.error instanceof Error ? deletionStatusQuery.error.message : null,
      deletionStatusPending: configured && status === 'authenticated' && deletionStatusQuery.isPending,
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
      signUpWithInvitation,
      requestPasswordReset,
      updatePassword,
      clearRecovery,
      recoveryStatus,
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
