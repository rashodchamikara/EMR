import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerStatus,
  Prisma,
  UserStatus,
} from '../../generated/prisma/client';
import { CreatePractitionerDto } from './dto/create-practitioner.dto';
import { QueryPractitionersDto } from './dto/query-practitioners.dto';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { PractitionersRepository } from './practitioners.repository';

@Injectable()
export class PractitionersService {
  constructor(private readonly repository: PractitionersRepository) {}

  eligibleMembers(organizationId: string, query: QueryPractitionersDto) { return this.repository.eligibleMembers(organizationId, query.page, query.limit, query.search); }
  facilityOptions(organizationId: string) { return this.repository.facilityOptions(organizationId); }
  async create(organizationId: string, dto: CreatePractitionerDto) {
    /*
     * Check 1:
     * Membership must belong to this organization and
     * have ACTIVE membership status.
     */
    const membership = await this.repository.findMembership(
      organizationId,
      dto.membershipId,
    );

    if (!membership) {
      throw new NotFoundException('Active organization membership not found.');
    }

    if (membership.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'A practitioner profile cannot be created for an inactive user account.',
      );
    }

    const existingPractitioner = await this.repository.findByMembershipId(
      organizationId,
      dto.membershipId,
    );

    if (existingPractitioner) {
      throw new ConflictException(
        'A practitioner profile already exists for this organization membership.',
      );
    }

    const registrationNumber = this.normalizeRegistrationNumber(
      dto.registrationNumber,
    );

    if (registrationNumber) {
      const duplicateRegistration =
        await this.repository.findByRegistrationNumber(
          organizationId,
          registrationNumber,
        );

      if (duplicateRegistration) {
        throw new ConflictException(
          'This professional registration number is already used by another practitioner in the organization.',
        );
      }
    }

    try {
      return await this.repository.create({
        organizationId,
        membershipId: dto.membershipId,
        type: dto.type,

        status: dto.status ?? PractitionerStatus.ACTIVE,

        title: this.normalizeOptionalText(dto.title),

        registrationNumber,

        registrationAuthority: this.normalizeOptionalText(
          dto.registrationAuthority,
        ),

        primarySpecialty: this.normalizeOptionalText(dto.primarySpecialty),

        consultationDurationMinutes: dto.consultationDurationMinutes ?? 15,
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findMany(organizationId: string, query: QueryPractitionersDto) {
    if (query.facilityId) {
      const facility = await this.repository.findFacility(
        organizationId,
        query.facilityId,
      );

      if (!facility) {
        throw new NotFoundException(
          'Facility not found in the active organization.',
        );
      }
    }

    return this.repository.findMany(organizationId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      type: query.type,
      status: query.status,
      facilityId: query.facilityId,
    });
  }

  async findOne(organizationId: string, practitionerId: string) {
    const practitioner = await this.repository.findById(
      organizationId,
      practitionerId,
    );

    if (!practitioner) {
      throw new NotFoundException('Practitioner not found.');
    }

    return practitioner;
  }

  async update(
    organizationId: string,
    practitionerId: string,
    dto: UpdatePractitionerDto,
  ) {
    const current = await this.findOne(organizationId, practitionerId);

    let registrationNumber: string | null | undefined;

    if (dto.registrationNumber !== undefined) {
      registrationNumber = this.normalizeRegistrationNumber(
        dto.registrationNumber,
      );

      if (
        registrationNumber &&
        registrationNumber !== current.registrationNumber
      ) {
        const duplicateRegistration =
          await this.repository.findByRegistrationNumber(
            organizationId,
            registrationNumber,
            practitionerId,
          );

        if (duplicateRegistration) {
          throw new ConflictException(
            'This professional registration number is already used by another practitioner in the organization.',
          );
        }
      }
    }

    const data: Prisma.PractitionerUpdateInput = {
      ...(dto.type !== undefined
        ? {
            type: dto.type,
          }
        : {}),

      ...(dto.status !== undefined
        ? {
            status: dto.status,
          }
        : {}),

      ...(dto.title !== undefined
        ? {
            title: this.normalizeOptionalText(dto.title),
          }
        : {}),

      ...(registrationNumber !== undefined
        ? {
            registrationNumber,
          }
        : {}),

      ...(dto.registrationAuthority !== undefined
        ? {
            registrationAuthority: this.normalizeOptionalText(
              dto.registrationAuthority,
            ),
          }
        : {}),

      ...(dto.primarySpecialty !== undefined
        ? {
            primarySpecialty: this.normalizeOptionalText(dto.primarySpecialty),
          }
        : {}),

      ...(dto.consultationDurationMinutes !== undefined
        ? {
            consultationDurationMinutes: dto.consultationDurationMinutes,
          }
        : {}),
    };

    try {
      return await this.repository.update(practitionerId, data);
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  /**
   * Converts values such as:
   *
   * " slmc-12345 " → "SLMC-12345"
   */
  private normalizeRegistrationNumber(
    value: string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    return normalized || null;
  }

  /**
   * Converts empty strings and whitespace-only values to null.
   */
  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private handleUniqueConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Concurrent staff change. Refresh and retry.');
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'The practitioner profile conflicts with an existing membership or registration number.',
      );
    }
  }
}
