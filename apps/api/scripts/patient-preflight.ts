import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  connectionLimit: 2, connectTimeout: 5000, acquireTimeout: 10000,
  allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });
async function main() {
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('patients','patient_facilities','patient_emergency_contacts','patient_number_sequences')`;
  console.log('Patient tables:', tables.map((t) => t.name).join(', ') || 'none');
  if (tables.length === 0) console.log('NO_PATIENT_TABLES: follow installation path A in README.');
  else if (tables.length === 4) console.log('ALL_PATIENT_TABLES_EXIST: follow installation path B. Verify schema before marking any migration applied.');
  else { console.log('PARTIAL_PATIENT_SCHEMA: stop migration; inspect the missing tables and failed migration history. Do not reset the database.'); process.exitCode = 2; }
  const historyTable = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`;
  if (historyTable.length) {
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`;
    console.table(migrations);
  } else console.log('No Prisma migration history table exists. Stop and baseline the existing database before using migrate deploy.');
}
void main().catch((error: unknown) => { console.error('Preflight failed:', error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
