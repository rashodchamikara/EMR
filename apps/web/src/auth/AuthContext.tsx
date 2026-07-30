import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loginRequest,
  logoutRequest,
  restoreSession,
  switchOrganizationRequest,
} from '../api/api-client';
import type { LoginInput } from './auth.types';
import {
  AuthContext,
  type AuthContextValue,
} from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthContextValue['user']>(null);

  const [initializing, setInitializing] =
    useState(true);

  useEffect(() => {
    const initialize =
      async (): Promise<void> => {
        try {
          const session =
            await restoreSession();

          setUser(session?.user ?? null);
        } catch {
          setUser(null);
        } finally {
          setInitializing(false);
        }
      };

    void initialize();
  }, []);

  const login = useCallback(
    async (
      input: LoginInput,
    ): Promise<void> => {
      const result = await loginRequest(
        input.email,
        input.password,
      );

      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(
    async (): Promise<void> => {
      await logoutRequest();

      setUser(null);
    },
    [],
  );

  const switchOrganization = useCallback(
    async (
      organizationId: string,
    ): Promise<void> => {
      const result =
        await switchOrganizationRequest(
          organizationId,
        );

      setUser(result.user);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      authenticated: Boolean(user),
      login,
      logout,
      switchOrganization,
    }),
    [
      user,
      initializing,
      login,
      logout,
      switchOrganization,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}