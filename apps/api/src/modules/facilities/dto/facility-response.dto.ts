import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityStatus, FacilityType } from '../../../generated/prisma/client';
export class FacilityResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) legalName!: string | null;
  @ApiProperty({ enum: FacilityType }) type!: FacilityType;
  @ApiProperty({ enum: FacilityStatus }) status!: FacilityStatus;
  @ApiProperty() timezone!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) addressLine1!: string | null;
  @ApiPropertyOptional({ nullable: true }) addressLine2!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;
  @ApiPropertyOptional({ nullable: true }) stateProvince!: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiProperty() countryCode!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}
export class FacilityPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
export class FacilityListResponseDto {
  @ApiProperty({ type: [FacilityResponseDto] }) data!: FacilityResponseDto[];
  @ApiProperty({ type: FacilityPaginationMetaDto })
  meta!: FacilityPaginationMetaDto;
}
