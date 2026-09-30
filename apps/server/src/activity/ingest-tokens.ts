import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { IngestTokenSummary } from '@agent-dashboard/contracts'
import type { IngestTokenStore } from './types.ts'

// The prefix makes a leaked token recognisable to secret scanners and to a person reading a
// log; only its hash is stored, so the database cannot hand one out.
const tokenPrefix = 'adt_'

const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest()

const toSummary = (row: Record<string, unknown>): IngestTokenSummary => ({
  tokenId: String(row.token_id ?? ''),
  label: String(row.label ?? ''),
  createdAt: String(row.created_at ?? ''),
  lastUsedAt: typeof row.last_used_at === 'string' ? row.last_used_at : null,
})

export const createIngestTokenStore = (database: DatabaseSync, now: () => number): IngestTokenStore => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ingest_tokens (
      token_id TEXT PRIMARY KEY,
      token_hash BLOB NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );
  `)
  const nowIso = (): string => new Date(now()).toISOString()

  return {
    createToken: (label) => {
      const token = `${tokenPrefix}${randomBytes(32).toString('base64url')}`
      const tokenId = randomUUID()
      database
        .prepare('INSERT INTO ingest_tokens (token_id, token_hash, label, created_at) VALUES (?, ?, ?, ?)')
        .run(tokenId, hashToken(token), label, nowIso())
      const summaryRow = database.prepare('SELECT * FROM ingest_tokens WHERE token_id = ?').get(tokenId) ?? {}
      return { summary: toSummary(summaryRow), token }
    },
    listTokens: () => database.prepare('SELECT * FROM ingest_tokens ORDER BY created_at').all().map(toSummary),
    revokeToken: (tokenId) => {
      database.prepare('DELETE FROM ingest_tokens WHERE token_id = ?').run(tokenId)
    },
    verifyToken: (presentedToken) => {
      if (presentedToken === undefined || !presentedToken.startsWith(tokenPrefix)) return false
      const presentedHash = hashToken(presentedToken)
      const matchingRow = database
        .prepare('SELECT token_id, token_hash FROM ingest_tokens')
        .all()
        .find((row) => row.token_hash instanceof Uint8Array && timingSafeEqual(Buffer.from(row.token_hash), presentedHash))
      if (matchingRow === undefined) return false
      database.prepare('UPDATE ingest_tokens SET last_used_at = ? WHERE token_id = ?').run(nowIso(), String(matchingRow.token_id))
      return true
    },
  }
}
