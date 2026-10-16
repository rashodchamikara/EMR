import {
  IsEnum,
  ValidateIf,
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
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(PractitionerType)
  type?: PractitionerType;

  @ValidateIf((_o, value: unknown) => value !== undefined)
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

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsInt()
  @Min(5)
  @Max(480)
  consultationDurationMinutes?: number;
}
