import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'
import { config, serverRoot } from '../config'

/** Driver-agnostic database handle: the same code runs on PostgreSQL and on embedded PGlite. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const migrationsFolder = path.join(serverRoot, 'drizzle')

async function connect() {
  if (config.databaseUrl) {
    const pool = new pg.Pool({ connectionString: config.databaseUrl })
    const db = drizzlePg(pool, { schema })
    await migratePg(db, { migrationsFolder })
    return { db: db as unknown as Db, kind: 'postgres' as const, close: () => pool.end() }
  }
  fs.mkdirSync(config.dataDir, { recursive: true })
  const client = new PGlite(path.join(config.dataDir, 'pglite'))
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder })
  return { db: db as unknown as Db, kind: 'pglite' as const, close: () => client.close() }
}

const connection = await connect()
export const db: Db = connection.db
export const dbKind = connection.kind
export const closeDb = connection.close
