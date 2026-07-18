import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @ApiOkResponse({ description: 'The API and database are available.' })
  @ApiServiceUnavailableResponse({
    description: 'The API is running, but the database is unavailable.',
  })
  async check(): Promise<{
    status: 'ok';
    service: string;
    database: 'connected';
    timestamp: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'emr-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        service: 'emr-api',
        database: 'disconnected',
      });
    }
  }
}
