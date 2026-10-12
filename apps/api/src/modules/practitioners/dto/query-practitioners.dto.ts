import { Type } from 'class-transformer';
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

export class QueryPractitionersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(PractitionerType)
  type?: PractitionerType;

  @IsOptional()
  @IsEnum(PractitionerStatus)
  status?: PractitionerStatus;

  @IsOptional()
  @IsUUID()
  facilityId?: string;
}
