import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const host = String(configService.getOrThrow('database.host'));

    const port = Number(configService.getOrThrow('database.port'));

    const user = String(configService.getOrThrow('database.user'));

    const password = String(configService.getOrThrow('database.password'));

    const database = String(configService.getOrThrow('database.name'));

    const connectionLimit = Number(
      configService.getOrThrow('database.connectionLimit'),
    );

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(`Invalid database port: ${String(port)}`);
    }

    if (!Number.isInteger(connectionLimit) || connectionLimit <= 0) {
      throw new Error(
        `Invalid database connection limit: ${String(connectionLimit)}`,
      );
    }

    console.log('### DATABASE CONFIG ###');
    console.log({
      host,
      port,
      user,
      database,
      connectionLimit,
    });

    const adapter = new PrismaMariaDb({
      host,
      port,
      user,
      password,
      database,
      connectionLimit,

      connectTimeout: 5_000,
      acquireTimeout: 10_000,
      idleTimeout: 300,

      allowPublicKeyRetrieval: true,
    });

    super({
      adapter,
      log: ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    console.log('### Prisma connecting...');
    await this.$connect();
    console.log('### Prisma initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
