import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const serverRoot = path.resolve(here, '..')

// Minimal .env loader (no dependency). Real environment variables always win.
const envFile = path.join(serverRoot, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2')
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}

const num = (v: string | undefined, fallback: number) => {
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  port: num(process.env.PORT, 3001),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'warn',
  databaseUrl: process.env.DATABASE_URL ?? '',
  dataDir: process.env.DATA_DIR ?? path.join(serverRoot, 'data'),
  corsOrigin: (process.env.WEB_ORIGIN ?? '') || true,
  allowReset: (process.env.ALLOW_RESET ?? 'true') !== 'false',
  demoTickMs: num(process.env.DEMO_TICK_MS, 1400),
  maxConcurrentRuns: num(process.env.MAX_CONCURRENT_RUNS, 5),
}
