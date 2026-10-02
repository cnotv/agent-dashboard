import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { MachineTokenKind, MachineTokenSummary } from '@dashi/contracts'
import type { MachineTokenStore } from './types.ts'

// The prefix makes a leaked token recognisable to secret scanners and to a person reading a
// log, and tells the two kinds apart; only its hash is stored, so the database cannot hand one out.
const machineTokenKinds: Record<MachineTokenKind, { tableName: string; tokenPrefix: string }> = {
  ingest: { tableName: 'ingest_tokens', tokenPrefix: 'adt_' },
  runner: { tableName: 'runner_tokens', tokenPrefix: 'adr_' },
}

const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest()

const toSummary = (row: Record<string, unknown>): MachineTokenSummary => ({
  tokenId: String(row.token_id ?? ''),
  label: String(row.label ?? ''),
  createdAt: String(row.created_at ?? ''),
  lastUsedAt: typeof row.last_used_at === 'string' ? row.last_used_at : null,
})

/**
 * Creates a store of tokens that machines present to the dashboard, keeping only a hash of each.
 * Ingest tokens let a machine report sessions; runner tokens let it claim sessions to start.
 * @param database The database; the kind's table is created when missing.
 * @param now The clock, for creation and last-use times.
 * @param kind Which of the two kinds this store holds, each in its own table.
 * @returns The token store.
 */
export const createMachineTokenStore = (database: DatabaseSync, now: () => number, kind: MachineTokenKind): MachineTokenStore => {
  const { tableName, tokenPrefix } = machineTokenKinds[kind]
  database.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
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
        .prepare(`INSERT INTO ${tableName} (token_id, token_hash, label, created_at) VALUES (?, ?, ?, ?)`)
        .run(tokenId, hashToken(token), label, nowIso())
      const summaryRow = database.prepare(`SELECT * FROM ${tableName} WHERE token_id = ?`).get(tokenId) ?? {}
      return { summary: toSummary(summaryRow), token }
    },
    listTokens: () => database.prepare(`SELECT * FROM ${tableName} ORDER BY created_at`).all().map(toSummary),
    revokeToken: (tokenId) => {
      database.prepare(`DELETE FROM ${tableName} WHERE token_id = ?`).run(tokenId)
    },
    verifyToken: (presentedToken) => {
      if (presentedToken === undefined || !presentedToken.startsWith(tokenPrefix)) return null
      const presentedHash = hashToken(presentedToken)
      const matchingRow = database
        .prepare(`SELECT * FROM ${tableName}`)
        .all()
        .find((row) => row.token_hash instanceof Uint8Array && timingSafeEqual(Buffer.from(row.token_hash), presentedHash))
      if (matchingRow === undefined) return null
      database.prepare(`UPDATE ${tableName} SET last_used_at = ? WHERE token_id = ?`).run(nowIso(), String(matchingRow.token_id))
      return toSummary({ ...matchingRow, last_used_at: nowIso() })
    },
  }
}
