import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SwitchOrganizationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') organizationId!: string;
}
