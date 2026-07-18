import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrganizationStatus } from '../../../generated/prisma/client';
import { CreateOrganizationDto } from './create-organization.dto';
export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['code'] as const),
) {
  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
