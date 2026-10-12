import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AssignStaffDto {
  @IsUUID()
  membershipId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
