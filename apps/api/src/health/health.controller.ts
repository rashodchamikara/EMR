import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      const databaseConnected = await this.databaseService.ping();

      return {
        status: databaseConnected ? 'ok' : 'degraded',
        service: 'emr-api',
        database: databaseConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'degraded',
        service: 'emr-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
