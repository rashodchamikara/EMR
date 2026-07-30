import { OrganizationStatus, UserStatus } from '../../generated/prisma/client';
import { AuthenticationUser } from './auth.repository';
import { AuthenticatedUser } from './auth.types';
interface SelectedOrganization {
  id: string;
  name: string;
  status: OrganizationStatus;
}
export function buildAuthenticatedUser(
  user: AuthenticationUser,
  sessionId: string,
  selectedOrganization: SelectedOrganization | null,
): AuthenticatedUser {
  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('Inactive user cannot be authenticated.');
  }
  const systemRoles = user.systemRoles.map(
    (assignment) => assignment.role.code,
  );
  const isSystemAdministrator = systemRoles.includes('SYSTEM_ADMIN');
  const selectedMembership = selectedOrganization
    ? (user.memberships.find(
        (membership) => membership.organizationId === selectedOrganization.id,
      ) ?? null)
    : null;
  if (selectedOrganization && !selectedMembership && !isSystemAdministrator) {
    throw new Error('The user does not belong to the selected organization.');
  }
  if (
    selectedOrganization &&
    selectedOrganization.status !== OrganizationStatus.ACTIVE
  ) {
    throw new Error('The selected organization is not active.');
  }
  const organizationRoles =
    selectedMembership?.roles.map((assignment) => assignment.role.code) ?? [];
  const permissionSet = new Set<string>();
  for (const assignment of user.systemRoles) {
    for (const rolePermission of assignment.role.permissions) {
      permissionSet.add(rolePermission.permission.code);
    }
  }
  if (selectedMembership) {
    for (const assignment of selectedMembership.roles) {
      for (const rolePermission of assignment.role.permissions) {
        permissionSet.add(rolePermission.permission.code);
      }
    }
  }
  return {
    userId: user.id,
    sessionId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: selectedOrganization?.id ?? null,
    organizationName: selectedOrganization?.name ?? null,
    roles: [...new Set([...systemRoles, ...organizationRoles])],
    permissions: [...permissionSet],
  };
}
