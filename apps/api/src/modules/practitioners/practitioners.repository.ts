import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  PractitionerStatus,
  PractitionerType,
  Prisma,
  StaffAssignmentStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

const practitionerMembershipInclude = {
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
} satisfies Prisma.OrganizationMembershipInclude;

const practitionerInclude = {
  membership: {
    include: practitionerMembershipInclude,
  },
} satisfies Prisma.PractitionerInclude;

export type PractitionerMembership = Prisma.OrganizationMembershipGetPayload<{
  include: typeof practitionerMembershipInclude;
}>;

export type PractitionerWithMembership = Prisma.PractitionerGetPayload<{
  include: typeof practitionerInclude;
}>;

export interface FindPractitionersOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  type?: PractitionerType | undefined;
  status?: PractitionerStatus | undefined;
  facilityId?: string | undefined;
}

@Injectable()
export class PractitionersRepository {
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

  findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<PractitionerMembership | null> {
    return this.prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
      include: practitionerMembershipInclude,
    });
  }

  findByMembershipId(organizationId: string, membershipId: string) {
    return this.prisma.practitioner.findFirst({
      where: {
        organizationId,
        membershipId,
      },
      include: practitionerInclude,
    });
  }

  findByRegistrationNumber(
    organizationId: string,
    registrationNumber: string,
    excludePractitionerId?: string,
  ) {
    return this.prisma.practitioner.findFirst({
      where: {
        organizationId,
        registrationNumber,
        ...(excludePractitionerId
          ? {
              id: {
                not: excludePractitionerId,
              },
            }
          : {}),
      },
      include: practitionerInclude,
    });
  }

  findById(organizationId: string, practitionerId: string) {
    return this.prisma.practitioner.findFirst({
      where: {
        id: practitionerId,
        organizationId,
      },
      include: practitionerInclude,
    });
  }

  findMany(organizationId: string, options: FindPractitionersOptions) {
    const search = options.search?.trim();
    const skip = (options.page - 1) * options.limit;

    const where: Prisma.PractitionerWhereInput = {
      organizationId,

      ...(options.type !== undefined
        ? {
            type: options.type,
          }
        : {}),

      ...(options.status !== undefined
        ? {
            status: options.status,
          }
        : {}),

      ...(options.facilityId
        ? {
            membership: {
              is: {
                facilityAssignments: {
                  some: {
                    organizationId,
                    facilityId: options.facilityId,
                    status: StaffAssignmentStatus.ACTIVE,
                  },
                },
              },
            },
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                },
              },
              {
                registrationNumber: {
                  contains: search,
                },
              },
              {
                registrationAuthority: {
                  contains: search,
                },
              },
              {
                primarySpecialty: {
                  contains: search,
                },
              },
              {
                membership: {
                  is: {
                    user: {
                      is: {
                        OR: [
                          {
                            firstName: {
                              contains: search,
                            },
                          },
                          {
                            lastName: {
                              contains: search,
                            },
                          },
                          {
                            email: {
                              contains: search,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.practitioner.findMany({
      where,
      include: practitionerInclude,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: options.limit,
    });
  }

  count(organizationId: string) {
    return this.prisma.practitioner.count({
      where: {
        organizationId,
      },
    });
  }

  create(data: Prisma.PractitionerUncheckedCreateInput) {
    return this.prisma.practitioner.create({
      data,
      include: practitionerInclude,
    });
  }

  update(practitionerId: string, data: Prisma.PractitionerUpdateInput) {
    return this.prisma.practitioner.update({
      where: {
        id: practitionerId,
      },
      data,
      include: practitionerInclude,
    });
  }
}
