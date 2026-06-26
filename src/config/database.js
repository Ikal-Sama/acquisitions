import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL || '';

let db;
let sql;

if (process.env.DATABASE_DRIVER === 'pg') {
  const { default: pg } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');

  const { Pool } = pg;
  const pool = new Pool({ connectionString: dbUrl });
  db = drizzle(pool);
  sql = pool;
} else {
  const { neon, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');

  if (dbUrl.includes('@neon-local') || dbUrl.includes('@localhost')) {
    const host = dbUrl.includes('@neon-local') ? 'neon-local' : 'localhost';
    neonConfig.fetchEndpoint = `http://${host}:5432/sql`;
    neonConfig.useSecureWebSocket = false;
  }

  neonConfig.poolQueryViaFetch = true;

  sql = neon(dbUrl);
  db = drizzle(sql);
}

export { db, sql };
