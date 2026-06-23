import 'dotenv/config'

import {neon, neonConfig} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';

if(process.env.NODE_ENV === 'development') {
    neonConfig.fetchEndpoint = (process.env.DATABASE_URL?.includes('@neon-local') || process.env.DATABASE_URL?.includes('@localhost'))
        ? 'http://localhost:5432/sql'
        : undefined;
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

export {db, sql};