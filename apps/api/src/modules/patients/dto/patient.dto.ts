import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientSex, PatientStatus } from '../../../generated/prisma/client';

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
export class EmergencyContactDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) phone!: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) relationship?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(50) alternatePhone?: string | null;
  @ApiPropertyOptional({ default: false }) @ValidateIf((_o, v: unknown) => v !== undefined) @IsBoolean() isPrimary?: boolean;
}
export class SavePatientDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) firstName!: string;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) lastName!: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) middleName?: string | null;
  @ApiPropertyOptional({ example: '1990-05-15' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) dateOfBirth?: string | null;
  @ApiPropertyOptional({ enum: PatientSex }) @IsOptional() @IsEnum(PatientSex) sex?: PatientSex | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(30) nationalIdType?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) nationalIdNumber?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(50) phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(50) alternatePhone?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsEmail() @MaxLength(190) email?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(190) addressLine1?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(190) addressLine2?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) city?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) stateProvince?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(30) postalCode?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) country?: string | null;
  @ApiPropertyOptional() @IsOptional() @Matches(/^(A|B|AB|O)[+-]$/) bloodGroup?: string | null;
  @ApiPropertyOptional({ enum: PatientStatus, default: 'ACTIVE' }) @ValidateIf((_o, v: unknown) => v !== undefined) @IsEnum(PatientStatus) status?: PatientStatus;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('all', { each: true }) facilityIds!: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() primaryFacilityId?: string | null;
  @ApiProperty({ type: [EmergencyContactDto] }) @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => EmergencyContactDto) emergencyContacts!: EmergencyContactDto[];
}
export class UpdatePatientDto extends SavePatientDto {
  @ApiProperty({ description: 'updatedAt returned by the last GET; prevents overwriting another edit.' })
  @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}
export class QueryPatientsDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: PatientStatus }) @IsOptional() @IsEnum(PatientStatus) status?: PatientStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() facilityId?: string;
}
