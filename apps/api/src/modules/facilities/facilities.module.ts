import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesRepository } from './facilities.repository';
import { FacilitiesService } from './facilities.service';

@Module({
  imports: [AuthModule],

  controllers: [FacilitiesController],

  providers: [FacilitiesService, FacilitiesRepository],

  exports: [FacilitiesService],
})
export class FacilitiesModule {}
