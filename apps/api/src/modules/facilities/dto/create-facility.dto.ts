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
import { FacilityType } from '../../../generated/prisma/client';
import {
  trimString,
  trimUppercaseString,
} from '../../../common/validation/string-transformers';
export class CreateFacilityDto {
  @ApiProperty({ example: 'MAIN' })
  @Transform(({ value }) => trimUppercaseString({ value }))
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'code can only contain uppercase letters, numbers, underscores and hyphens',
  })
  code!: string;
  @ApiProperty({ example: 'Main Medical Centre' })
  @Transform(({ value }) => trimString({ value }))
  @IsString()
  @Length(2, 150)
  name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;
  @ApiPropertyOptional({ enum: FacilityType, default: FacilityType.CLINIC })
  @IsOptional()
  @IsEnum(FacilityType)
  type?: FacilityType;
  @ApiPropertyOptional({ default: 'Asia/Colombo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must contain 7 to 15 digits and may begin with +',
  })
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
  @ApiPropertyOptional({ default: 'CA' })
  @Transform(({ value }) => trimUppercaseString({ value }))
  @IsOptional()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;
}
