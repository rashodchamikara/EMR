import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FacilityStatus } from '../../../generated/prisma/client';
import { CreateFacilityDto } from './create-facility.dto';
export class UpdateFacilityDto extends PartialType(
  OmitType(CreateFacilityDto, ['code'] as const),
) {
  @ApiPropertyOptional({ enum: FacilityStatus })
  @IsOptional()
  @IsEnum(FacilityStatus)
  status?: FacilityStatus;
}
