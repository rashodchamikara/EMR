import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  StaffAssignmentStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFacility(organizationId: string, facilityId: string) {
    return this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  findMembership(organizationId: string, membershipId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  findAssignment(facilityId: string, membershipId: string) {
    return this.prisma.staffFacilityAssignment.findFirst({
      where: {
        facilityId,
        membershipId,
      },
    });
  }

  findMany(organizationId: string, facilityId: string) {
    return this.prisma.staffFacilityAssignment.findMany({
      where: {
        organizationId,
        facilityId,
      },
      include: {
        membership: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
              },
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          assignedAt: 'desc',
        },
      ],
    });
  }

  createAssignment(
    organizationId: string,
    facilityId: string,
    membershipId: string,
    isPrimary: boolean,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      if (isPrimary) {
        await transaction.staffFacilityAssignment.updateMany({
          where: {
            organizationId,
            membershipId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return transaction.staffFacilityAssignment.create({
        data: {
          organizationId,
          facilityId,
          membershipId,
          isPrimary,
          status: StaffAssignmentStatus.ACTIVE,
        },
        include: {
          facility: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          membership: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  status: true,
                },
              },
              roles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  findAssignmentById(
    organizationId: string,
    facilityId: string,
    assignmentId: string,
  ) {
    return this.prisma.staffFacilityAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
        facilityId,
      },
    });
  }

  updateAssignment(
    assignmentId: string,
    data: Prisma.StaffFacilityAssignmentUpdateInput,
  ) {
    return this.prisma.staffFacilityAssignment.update({
      where: {
        id: assignmentId,
      },
      data,
    });
  }
}
