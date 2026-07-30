import { createContext } from 'react';
import type {
  AuthenticatedUser,
  LoginInput,
} from './auth.types';

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  initializing: boolean;
  authenticated: boolean;

  login(input: LoginInput): Promise<void>;

  logout(): Promise<void>;

  switchOrganization(
    organizationId: string,
  ): Promise<void>;
}

export const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);