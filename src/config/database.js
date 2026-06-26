import 'dotenv/config';

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (
  process.env.NODE_ENV === 'development' &&
  (process.env.DATABASE_URL?.includes('@neon-local') ||
    process.env.DATABASE_URL?.includes('@localhost'))
) {
  const host = process.env.DATABASE_URL?.includes('@neon-local')
    ? 'neon-local'
    : 'localhost';
  neonConfig.fetchEndpoint = `http://${host}:5432/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

export { db, sql };
