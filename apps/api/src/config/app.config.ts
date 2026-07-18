import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV ?? 'development',

  name: process.env.APP_NAME ?? 'EMR API',

  version: process.env.APP_VERSION ?? '0.1.0',

  port: Number(process.env.PORT ?? 3000),

  apiPrefix: process.env.API_PREFIX ?? 'api/v1',

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  logLevel: process.env.LOG_LEVEL ?? 'debug',
}));
