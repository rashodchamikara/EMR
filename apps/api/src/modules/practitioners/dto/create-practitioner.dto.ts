import {
  IsEnum,
  ValidateIf,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PractitionerStatus,
  PractitionerType,
} from '../../../generated/prisma/client';

export class CreatePractitionerDto {
  @IsUUID()
  membershipId!: string;

  @IsEnum(PractitionerType)
  type!: PractitionerType;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(PractitionerStatus)
  status?: PractitionerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  registrationAuthority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  primarySpecialty?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsInt()
  @Min(5)
  @Max(480)
  consultationDurationMinutes?: number;
}
