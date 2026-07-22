import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  loginRequest,
  logoutRequest,
  restoreSession,
} from './api/api-client';
import type {
  AuthenticatedUser,
  LoginInput,
} from './auth.types';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  initializing: boolean;
  authenticated: boolean;

  login(
    input: LoginInput,
  ): Promise<void>;

  logout(): Promise<void>;
}

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthenticatedUser | null>(
      null,
    );

  const [
    initializing,
    setInitializing,
  ] = useState(true);

  useEffect(() => {
    const initialize =
      async (): Promise<void> => {
        const session =
          await restoreSession();

        setUser(
          session?.user ?? null,
        );

        setInitializing(false);
      };

    void initialize();
  }, []);

  const login = useCallback(
    async (
      input: LoginInput,
    ): Promise<void> => {
      const result =
        await loginRequest(
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

  const value = useMemo(
    () => ({
      user,
      initializing,
      authenticated:
        Boolean(user),
      login,
      logout,
    }),
    [
      user,
      initializing,
      login,
      logout,
    ],
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth():
  AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return context;
}