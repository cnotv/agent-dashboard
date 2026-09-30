import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import boardResponseFixture from '../github/fixtures/board-response.json' with { type: 'json' }
import { createActivityStore } from '../activity/activity-store.ts'
import { createIngestTokenStore } from '../activity/ingest-tokens.ts'
import { createSessionStore } from '../auth/session-store.ts'
import type { AuthDependencies } from '../auth/types.ts'
import { generateKeyMaterial } from '../secrets/crypto.ts'
import { secretDefinitions } from '../secrets/definitions.ts'
import { createVault } from '../secrets/vault.ts'
import { createApp } from './create-app.ts'
import type { AppDependencies } from './types.ts'

export const testHost = 'localhost:4317'

export const signedVideoUrl = 'https://private-user-images.githubusercontent.com/1/video.mp4?jwt=signed'

const pullRequestBodyHtmlFixture = {
  data: {
    repository: {
      pullRequest: { bodyHTML: `<p>Closes #4</p><video src="${signedVideoUrl}" controls="controls"></video>` },
    },
  },
}

export const createTestApp = (
  overrides: Partial<AppDependencies> = {},
  authOverrides: Partial<AuthDependencies> = {},
  clock: { now: number } = { now: 0 },
  restResponses: Record<string, Response> = {},
) => {
  const database = new DatabaseSync(':memory:')
  const activityStore = createActivityStore(database)
  const ingestTokens = createIngestTokenStore(database, () => clock.now)
  const vault = createVault(database, { mode: 'environment', environmentKey: generateKeyMaterial() })
  const receivedTokens: string[] = []
  const receivedRestPaths: string[] = []
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
    activity: { activityStore, ingestTokens, now: () => clock.now },
    repositories: [{ owner: 'cnotv', name: 'generative-art' }],
    secretDefinitions,
    testSecret: async () => ({ ok: true, status: 200, message: 'The provider accepted the key' }),
    createGraphqlFetcher: (token) => async (query) => {
      receivedTokens.push(token)
      return query.includes('bodyHTML') ? pullRequestBodyHtmlFixture : boardResponseFixture
    },
    createGithubRestFetcher: (token) => async (path) => {
      receivedTokens.push(token)
      receivedRestPaths.push(path)
      return restResponses[path] ?? new Response('{}', { status: 404 })
    },
    mediaCacheDirectory: mkdtempSync(join(tmpdir(), 'agent-dashboard-media-')),
    allowedHostNames: ['localhost', '127.0.0.1'],
    boardCacheMilliseconds: 60_000,
    now: () => 0,
    ...overrides,
  })
  return { app, vault, database, receivedTokens, receivedRestPaths, activityStore, ingestTokens }
}

export const jsonRequest = (method: string, path: string, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Request(`http://${testHost}${path}`, {
    method,
    headers: { host: testHost, 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  })

export const getRequest = (path: string, extraHeaders: Record<string, string> = {}) =>
  new Request(`http://${testHost}${path}`, { headers: { host: testHost, ...extraHeaders } })
