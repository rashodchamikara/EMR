import { IsBoolean, ValidateIf, IsUUID } from 'class-validator';

export class AssignStaffDto {
  @IsUUID()
  membershipId!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  isPrimary?: boolean;
}
