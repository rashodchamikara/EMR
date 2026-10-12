import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { StaffAssignmentStatus } from '../../../generated/prisma/client';

export class UpdateStaffAssignmentDto {
  @IsOptional()
  @IsEnum(StaffAssignmentStatus)
  status?: StaffAssignmentStatus;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
