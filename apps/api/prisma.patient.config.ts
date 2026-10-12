import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Use the same DB_* values as the running API, without replacing its existing config.
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is required in the API .env file.`);
  return value;
}
const host = required('DB_HOST');
const port = Number(required('DB_PORT'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT is invalid.');
const url = `mysql://${encodeURIComponent(required('DB_USER'))}:${encodeURIComponent(process.env.DB_PASSWORD ?? '')}@${host}:${port}/${encodeURIComponent(required('DB_NAME'))}`;
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url },
});
