import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '../../../generated/prisma/client';
export class CreateOrganizationDto {
  @ApiProperty({
    example: 'DEMO_CLINIC',
    description: 'Unique administrative organization code.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' 
  ? value.trim().toUpperCase() 
  : value,
  )
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'code can only contain uppercase letters, numbers, underscores and hyphens',
  })
  code!: string;
  @ApiProperty({ example: 'Demo Medical Centre' })
  @Transform(({ value }) => (
    typeof value === 'string' 
    ? value.trim() 
    : value
   ))
  @IsString()
  @Length(2, 150)
  name!: string;
  @ApiPropertyOptional({ example: 'Demo Medical Centre Private Limited' })
  @Transform(({ value }) => (
    typeof value === 'string' 
    ? value.trim() 
    : value
))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;
  @ApiPropertyOptional({
    enum: OrganizationType,
    default: OrganizationType.CLINIC,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;
  @ApiPropertyOptional({ example: 'Asia/Colombo', default: 'Asia/Colombo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
  @ApiPropertyOptional({ example: 'en-LK', default: 'en-LK' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;
  @ApiPropertyOptional({ example: '+94112345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must contain between 7 and 15 digits and may begin with +',
  })
  phone?: string;
  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @ApiPropertyOptional({ example: '100 Example Road' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;
  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
  @ApiPropertyOptional({ example: 'Western Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;
  @ApiPropertyOptional({ example: '00300' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
  @ApiPropertyOptional({ example: 'LK', default: 'LK' })
  @Transform(({ value }) =>
    typeof value === 'string' 
  ? value.trim().toUpperCase() 
  : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'countryCode must be a two-letter uppercase country code',
  })
  countryCode?: string;
}
