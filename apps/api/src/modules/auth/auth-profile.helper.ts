import { UserStatus } from '../../generated/prisma/client';
import { AuthenticatedUser } from './auth.types';
import { AuthenticationUser } from './auth.repository';

export function buildAuthenticatedUser(
  user: AuthenticationUser,
  sessionId: string,
): AuthenticatedUser {
  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('Inactive user cannot be authenticated.');
  }

  const primaryMembership =
    user.memberships.find((membership) => membership.isPrimary) ??
    user.memberships[0] ??
    null;

  const systemRoles =
    user.systemRoles.map(
    (assignment) => assignment.role.code,
  );

  const organizationRoles =
    primaryMembership?.roles.map(
      (assignment) =>
        assignment.role.code,
    ) ?? [];

  const permissionSet =
    new Set<string>();

  for (const assignment of user.systemRoles) {
    for (
      const rolePermission of
      assignment.role.permissions
    ) {
      permissionSet.add(
        rolePermission.permission.code,
      );
    }
  }

  if (primaryMembership) {
    for (
      const assignment of
      primaryMembership.roles
    ) {
      for (
        const rolePermission of
        assignment.role.permissions
      ) {
        permissionSet.add(
          rolePermission.permission.code,
        );
      }
    }
  }

  return {
    userId: user.id,
    sessionId,

    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,

    organizationId:
      primaryMembership?.organizationId ??
      null,

    roles: [
      ...new Set([
        ...systemRoles,
        ...organizationRoles,
      ]),
    ],

    permissions: [
      ...permissionSet,
    ],
  };
}