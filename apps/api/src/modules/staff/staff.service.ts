import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { StaffRepository } from './staff.repository';

@Injectable()
export class StaffService {
  constructor(private readonly repository: StaffRepository) {}

  async assign(
    organizationId: string,
    facilityId: string,
    dto: AssignStaffDto,
  ) {
    const facility = await this.repository.findFacility(
      organizationId,
      facilityId,
    );

    if (!facility) {
      throw new NotFoundException(
        'Facility not found in the active organization.',
      );
    }

    /*
     * Check 2:
     * The membership must belong to the same organization
     * and must have ACTIVE membership status.
     */
    const membership = await this.repository.findMembership(
      organizationId,
      dto.membershipId,
    );

    if (!membership) {
      throw new NotFoundException('Active organization membership not found.');
    }

    const existingAssignment = await this.repository.findAssignment(
      facilityId,
      dto.membershipId,
    );

    if (existingAssignment) {
      throw new ConflictException(
        'This staff member is already assigned to the facility.',
      );
    }

    return this.repository.createAssignment(
      organizationId,
      facilityId,
      dto.membershipId,
      dto.isPrimary ?? false,
    );
  }

  async findMany(organizationId: string, facilityId: string) {
    const facility = await this.repository.findFacility(
      organizationId,
      facilityId,
    );

    if (!facility) {
      throw new NotFoundException(
        'Facility not found in the active organization.',
      );
    }

    return this.repository.findMany(organizationId, facilityId);
  }
}
