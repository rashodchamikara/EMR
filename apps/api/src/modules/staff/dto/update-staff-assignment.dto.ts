import { IsBoolean, IsEnum, ValidateIf } from 'class-validator';
import { StaffAssignmentStatus } from '../../../generated/prisma/client';

export class UpdateStaffAssignmentDto {
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(StaffAssignmentStatus)
  status?: StaffAssignmentStatus;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  isPrimary?: boolean;
}
