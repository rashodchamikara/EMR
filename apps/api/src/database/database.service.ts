import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';

interface DatabasePingRow extends RowDataPacket {
  ok: number;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = createPool({
      host: this.configService.getOrThrow<string>('DB_HOST'),
      port: Number(this.configService.getOrThrow<string>('DB_PORT')),
      database: this.configService.getOrThrow<string>('DB_NAME'),
      user: this.configService.getOrThrow<string>('DB_USER'),
      password: this.configService.getOrThrow<string>('DB_PASSWORD'),

      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async ping(): Promise<boolean> {
    const [rows] = await this.pool.query<DatabasePingRow[]>('SELECT 1 AS ok');

    return rows[0]?.ok === 1;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
