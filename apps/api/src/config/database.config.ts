import { registerAs } from '@nestjs/config';
export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3307),
  name: process.env.DB_NAME ?? 'emr_dev',
  user: process.env.DB_USER ?? 'emr_user',
  password: process.env.DB_PASSWORD ?? '',
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
}));
