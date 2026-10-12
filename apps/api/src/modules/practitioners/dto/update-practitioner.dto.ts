import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PractitionerStatus,
  PractitionerType,
} from '../../../generated/prisma/client';

export class UpdatePractitionerDto {
  @IsOptional()
  @IsEnum(PractitionerType)
  type?: PractitionerType;

  @IsOptional()
  @IsEnum(PractitionerStatus)
  status?: PractitionerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  registrationAuthority?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  primarySpecialty?: string | null;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  consultationDurationMinutes?: number;
}
