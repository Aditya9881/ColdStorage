import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env, isDev } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Determine if SSL is needed (external Render URLs, production, etc.)
  const needsSsl = env.DATABASE_URL.includes('render.com') ||
    env.DATABASE_URL.includes('sslmode=require') ||
    env.NODE_ENV === 'production';

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDev) {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      // Verify with a real query (adapter-pg $connect can succeed without reaching DB)
      await prisma.$queryRawUnsafe('SELECT 1');
      console.log('[Database] Connected successfully');
      return;
    } catch (error) {
      console.error(`[Database] Connection attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt === maxRetries) {
        console.error('[Database] All connection attempts exhausted. Continuing with degraded DB...');
        // Don't exit — let the app try to reconnect on individual queries
        return;
      }
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[Database] Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('[Database] Disconnected');
}
