import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../common/security/password-hashing';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { UpdateStaffAssignmentDto } from './dto/update-staff-assignment.dto';
import { CreateStaffDto, LinkStaffDto, QueryMembershipsDto, UpdateMembershipDto } from './dto/membership.dto';

const userSelect = { id: true, firstName: true, lastName: true, email: true, status: true } satisfies Prisma.UserSelect;
const memberInclude = { user: { select: userSelect }, roles: { include: { role: { select: { id: true, code: true, name: true } } } }, practitioner: { select: { id: true, type: true, status: true } }, facilityAssignments: { include: { facility: { select: { id: true, code: true, name: true } } } } } satisfies Prisma.OrganizationMembershipInclude;
const assignmentInclude = { membership: { include: { user: { select: userSelect }, roles: { include: { role: { select: { id: true, code: true, name: true } } } } } }, facility: { select: { id: true, code: true, name: true } } } satisfies Prisma.StaffFacilityAssignmentInclude;
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}
  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 }); }
      catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2034') { if (attempt < 2) { await new Promise((r) => setTimeout(r, 40 * (attempt + 1))); continue; } throw new ConflictException('Concurrent change. Refresh and retry.'); }
          if (e.code === 'P2002') throw new ConflictException('This account, membership or assignment already exists. No duplicate was created.');
        }
        throw e;
      }
    }
    throw new ConflictException('Please retry.');
  }
  private async activeOrganization(tx: Prisma.TransactionClient, organizationId: string) {
    const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { status: true } });
    if (!org) throw new NotFoundException('Organization not found.');
    if (org.status !== 'ACTIVE') throw new BadRequestException('The organization must be active.');
  }
  private async allowedRoles(tx: Prisma.TransactionClient, actor: AuthenticatedUser) {
    const roles = await tx.role.findMany({ where: { scope: 'ORGANIZATION' }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
    return roles.filter((r) => actor.roles.includes('SYSTEM_ADMIN') || (
      (r.code !== 'ORG_ADMIN' || actor.roles.includes('ORG_ADMIN')) && r.permissions.every((p) => actor.permissions.includes(p.permission.code))
    ));
  }
  private async checkRoles(tx: Prisma.TransactionClient, actor: AuthenticatedUser, codes: string[]) {
    if (!actor.permissions.includes('roles.assign')) throw new ForbiddenException('Role assignment permission is required.');
    const allowed = await this.allowedRoles(tx, actor);
    const selected = allowed.filter((r) => codes.includes(r.code));
    if (selected.length !== codes.length) throw new ForbiddenException('One or more roles cannot be assigned by your account. System roles cannot be assigned here.');
    return selected;
  }
  async roles(actor: AuthenticatedUser) {
    const roles = await this.allowedRoles(this.prisma, actor);
    return roles.map(({ id, code, name }) => ({ id, code, name }));
  }
  facilities(organizationId: string) {
    return this.prisma.facility.findMany({ where: { organizationId }, select: { id: true, organizationId: true, code: true, name: true, status: true, type: true, city: true }, orderBy: { name: 'asc' } });
  }
  async members(organizationId: string, query: QueryMembershipsDto) {
    const where: Prisma.OrganizationMembershipWhereInput = { organizationId, status: query.status,
      ...(query.search ? { user: { is: { OR: [{ firstName: { contains: query.search } }, { lastName: { contains: query.search } }, { email: { contains: query.search } }] } } } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organizationMembership.findMany({ where, include: memberInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.organizationMembership.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async create(organizationId: string, dto: CreateStaffDto, actor: AuthenticatedUser) {
    // Hash outside the transaction to keep database locks short. Never log or return passwords.
    const passwordHash = await hashPassword(dto.password);
    return this.transaction(async (tx) => {
      await this.activeOrganization(tx, organizationId);
      const roles = await this.checkRoles(tx, actor, dto.roleCodes);
      const email = dto.email.trim().toLowerCase();
      const existing = await tx.user.findUnique({ where: { emailNormalized: email }, select: { id: true } });
      if (existing) throw new ConflictException('Unable to create a new account with this email. A system administrator can link an existing account using Link existing account.');
      const user = await tx.user.create({ data: { email, emailNormalized: email, firstName: dto.firstName, lastName: dto.lastName, passwordHash, status: 'ACTIVE' }, select: { id: true } });
      return tx.organizationMembership.create({ data: { userId: user.id, organizationId, status: 'ACTIVE', isPrimary: true, jobTitle: dto.jobTitle?.trim() || null, roles: { create: roles.map((r) => ({ roleId: r.id })) } }, include: memberInclude });
    });
  }
  link(organizationId: string, dto: LinkStaffDto, actor: AuthenticatedUser) {
    if (!actor.roles.includes('SYSTEM_ADMIN')) throw new ForbiddenException('Only a system administrator can link an existing global account.');
    return this.transaction(async (tx) => {
      await this.activeOrganization(tx, organizationId);
      const roles = await this.checkRoles(tx, actor, dto.roleCodes);
      const user = await tx.user.findUnique({ where: { emailNormalized: dto.email.trim().toLowerCase() }, select: { id: true, status: true } });
      if (!user || user.status !== 'ACTIVE') throw new BadRequestException('An active account with that email is required.');
      // Existing names, password, global status and other memberships remain untouched.
      return tx.organizationMembership.create({ data: { userId: user.id, organizationId, status: 'ACTIVE', jobTitle: dto.jobTitle?.trim() || null, roles: { create: roles.map((r) => ({ roleId: r.id })) } }, include: memberInclude });
    });
  }
  updateMember(organizationId: string, id: string, dto: UpdateMembershipDto, actor: AuthenticatedUser) {
    return this.transaction(async (tx) => {
      await this.activeOrganization(tx, organizationId);
      const member = await tx.organizationMembership.findFirst({
        where: { id, organizationId },
        include: {
          user: { select: { status: true, systemRoles: { include: { role: true } } } },
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!member) throw new NotFoundException('Organization member not found.');
      if (!actor.roles.includes('SYSTEM_ADMIN') && (member.user.systemRoles.length > 0 || member.roles.some((r) => r.role.permissions.some((p) => !actor.permissions.includes(p.permission.code))))) throw new ForbiddenException('You cannot manage a more privileged account.');
      const securityChange = dto.roleCodes !== undefined || (dto.status !== undefined && dto.status !== member.status);
      if (securityChange && member.userId === actor.userId) throw new ForbiddenException('Use another administrator to change your own membership status or roles.');
      if (dto.status === 'ACTIVE' && member.user.status !== 'ACTIVE') throw new BadRequestException('The user account must be active first.');
      if (dto.roleCodes) {
        const roles = await this.checkRoles(tx, actor, dto.roleCodes);
        await tx.membershipRole.deleteMany({ where: { membershipId: id } });
        await tx.membershipRole.createMany({ data: roles.map((r) => ({ membershipId: id, roleId: r.id })) });
      }
      await tx.organizationMembership.update({ where: { id }, data: { status: dto.status, ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle?.trim() || null } : {}) } });
      if (dto.status && dto.status !== 'ACTIVE') {
        await tx.staffFacilityAssignment.updateMany({ where: { organizationId, membershipId: id }, data: { status: 'SUSPENDED', isPrimary: false, endedAt: new Date() } });
        await tx.practitioner.updateMany({ where: { organizationId, membershipId: id }, data: { status: 'SUSPENDED' } });
      }
      if (securityChange) {
        // Tokens contain roles/permissions. Revoke sessions so old grants cannot remain usable.
        await tx.userSession.updateMany({ where: { userId: member.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return tx.organizationMembership.findUniqueOrThrow({ where: { id }, include: memberInclude });
    });
  }
  async findMany(organizationId: string, facilityId: string) {
    const facility = await this.prisma.facility.findFirst({ where: { id: facilityId, organizationId }, select: { id: true } });
    if (!facility) throw new NotFoundException('Facility not found in this organization.');
    return this.prisma.staffFacilityAssignment.findMany({ where: { organizationId, facilityId }, include: assignmentInclude, orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'desc' }] });
  }
  private async activeMemberAndFacility(tx: Prisma.TransactionClient, organizationId: string, membershipId: string, facilityId: string) {
    await this.activeOrganization(tx, organizationId);
    const member = await tx.organizationMembership.findFirst({ where: { id: membershipId, organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } }, select: { id: true } });
    if (!member) throw new BadRequestException('Choose an active staff member in this organization.');
    const facility = await tx.facility.findFirst({ where: { id: facilityId, organizationId, status: 'ACTIVE' }, select: { id: true } });
    if (!facility) throw new BadRequestException('Choose an active facility in this organization.');
  }
  assign(organizationId: string, facilityId: string, dto: AssignStaffDto) {
    return this.transaction(async (tx) => {
      await this.activeMemberAndFacility(tx, organizationId, dto.membershipId, facilityId);
      if (dto.isPrimary) await tx.staffFacilityAssignment.updateMany({ where: { organizationId, membershipId: dto.membershipId, isPrimary: true }, data: { isPrimary: false } });
      return tx.staffFacilityAssignment.create({ data: { organizationId, facilityId, membershipId: dto.membershipId, isPrimary: dto.isPrimary ?? false, status: 'ACTIVE' }, include: assignmentInclude });
    });
  }
  updateAssignment(organizationId: string, facilityId: string, id: string, dto: UpdateStaffAssignmentDto) {
    return this.transaction(async (tx) => {
      const assignment = await tx.staffFacilityAssignment.findFirst({ where: { id, organizationId, facilityId } });
      if (!assignment) throw new NotFoundException('Assignment not found in this facility.');
      const status = dto.status ?? assignment.status;
      if (status === 'ACTIVE') await this.activeMemberAndFacility(tx, organizationId, assignment.membershipId, facilityId);
      if (dto.isPrimary && status !== 'ACTIVE') throw new BadRequestException('Only an active assignment can be primary.');
      const isPrimary = status === 'ACTIVE' ? dto.isPrimary ?? assignment.isPrimary : false;
      if (isPrimary) await tx.staffFacilityAssignment.updateMany({ where: { organizationId, membershipId: assignment.membershipId, isPrimary: true }, data: { isPrimary: false } });
      return tx.staffFacilityAssignment.update({ where: { id }, data: { status, isPrimary, endedAt: status === 'ACTIVE' ? null : assignment.endedAt ?? new Date() }, include: assignmentInclude });
    });
  }
}
