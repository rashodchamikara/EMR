import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffController } from './staff.controller';
import { MembershipsController } from './memberships.controller';
import { StaffService } from './staff.service';
@Module({ imports: [AuthModule], controllers: [StaffController, MembershipsController], providers: [StaffService], exports: [StaffService] })
export class StaffModule {}
