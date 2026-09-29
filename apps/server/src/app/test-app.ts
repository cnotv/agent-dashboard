import { DatabaseSync } from 'node:sqlite'
import boardResponseFixture from '../github/fixtures/board-response.json' with { type: 'json' }
import { createSessionStore } from '../auth/session-store.ts'
import type { AuthDependencies } from '../auth/types.ts'
import { generateKeyMaterial } from '../secrets/crypto.ts'
import { secretDefinitions } from '../secrets/definitions.ts'
import { createVault } from '../secrets/vault.ts'
import { createApp } from './create-app.ts'
import type { AppDependencies } from './types.ts'

export const testHost = 'localhost:4317'

export const createTestApp = (overrides: Partial<AppDependencies> = {}, authOverrides: Partial<AuthDependencies> = {}) => {
  const database = new DatabaseSync(':memory:')
  const vault = createVault(database, { mode: 'environment', environmentKey: generateKeyMaterial() })
  const receivedTokens: string[] = []
  const app = createApp({
    vault,
    auth: {
      sessionStore: createSessionStore(() => 0),
      githubSignIn: null,
      signInRequired: false,
      secureCookies: false,
      now: () => 0,
      ...authOverrides,
    },
    repositories: [{ owner: 'cnotv', name: 'generative-art' }],
    secretDefinitions,
    testSecret: async () => ({ ok: true, status: 200, message: 'The provider accepted the key' }),
    createGraphqlFetcher: (token) => async () => {
      receivedTokens.push(token)
      return boardResponseFixture
    },
    allowedHostNames: ['localhost', '127.0.0.1'],
    boardCacheMilliseconds: 60_000,
    now: () => 0,
    ...overrides,
  })
  return { app, vault, database, receivedTokens }
}

export const jsonRequest = (method: string, path: string, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Request(`http://${testHost}${path}`, {
    method,
    headers: { host: testHost, 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  })

export const getRequest = (path: string, extraHeaders: Record<string, string> = {}) =>
  new Request(`http://${testHost}${path}`, { headers: { host: testHost, ...extraHeaders } })
