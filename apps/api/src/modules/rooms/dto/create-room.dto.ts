import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RoomStatus, RoomType } from '../../../generated/prisma/client';

export class CreateRoomDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsString()
  @Length(2, 30)
  code!: string;

  @IsString()
  @Length(2, 150)
  name!: string;

  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
