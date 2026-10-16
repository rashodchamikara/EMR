import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { MembershipStatus } from '../../../generated/prisma/client';
const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
export class CreateStaffDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) firstName!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) lastName!: string;
  @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Matches(/\S/, { message: 'Password cannot contain only spaces.' }) @MinLength(12) @MaxLength(128) password!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(150) jobTitle?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsString({ each: true }) @MaxLength(80, { each: true }) roleCodes!: string[];
}
export class LinkStaffDto {
  @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(150) jobTitle?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsString({ each: true }) @MaxLength(80, { each: true }) roleCodes!: string[];
}
export class UpdateMembershipDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(150) jobTitle?: string | null;
  @ValidateIf((_o, v: unknown) => v !== undefined) @IsEnum(MembershipStatus) status?: MembershipStatus;
  @ValidateIf((_o, v: unknown) => v !== undefined) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsString({ each: true }) @MaxLength(80, { each: true }) roleCodes?: string[];
}
export class QueryMembershipsDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(150) search?: string;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
}
