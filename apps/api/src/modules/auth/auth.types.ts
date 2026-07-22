export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  roles: string[];
  permissions: string[];
}
export interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: 'access';
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}
export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}