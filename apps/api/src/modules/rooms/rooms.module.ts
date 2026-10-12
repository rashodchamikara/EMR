import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { RoomsService } from './rooms.service';

@Module({
  imports: [AuthModule],

  controllers: [RoomsController],

  providers: [RoomsService, RoomsRepository],

  exports: [RoomsService],
})
export class RoomsModule {}
