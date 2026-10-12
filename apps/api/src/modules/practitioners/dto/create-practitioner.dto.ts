import {
  IsEnum,
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

  @IsOptional()
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

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  consultationDurationMinutes?: number;
}
