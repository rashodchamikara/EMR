import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PractitionersController } from './practitioners.controller';
import { PractitionersRepository } from './practitioners.repository';
import { PractitionersService } from './practitioners.service';

@Module({
  imports: [AuthModule],

  controllers: [PractitionersController],

  providers: [PractitionersService, PractitionersRepository],

  exports: [PractitionersService],
})
export class PractitionersModule {}
