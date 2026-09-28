import { mkdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app/create-app.ts'
import { createGithubGraphqlFetcher } from './github/board.ts'
import { loadRepositories } from './repos/load-repositories.ts'
import { resolveRuntimeSettings } from './runtime/settings.ts'
import { parseEncodedKey } from './secrets/crypto.ts'
import { secretDefinitions } from './secrets/definitions.ts'
import { testSecretAgainstProvider } from './secrets/test-secret.ts'
import { createVault } from './secrets/vault.ts'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

const settingsResult = resolveRuntimeSettings({
  environment: process.env,
  readMasterKeyFile: (filePath) => readFileSync(filePath, 'utf8'),
  defaultRepositoriesFile: join(workspaceRoot, 'config/repos.json'),
  defaultWebDistDirectory: join(workspaceRoot, 'apps/web/dist'),
})

if (!settingsResult.ok) {
  process.stderr.write(`agent-dashboard: ${settingsResult.reason}\n`)
  process.exit(1)
}

const { settings } = settingsResult
mkdirSync(settings.dataDirectory, { recursive: true })
const database = new DatabaseSync(join(settings.dataDirectory, 'dashboard.sqlite'))

const vault = createVault(database, {
  mode: settings.masterKeyEncoded === null ? 'passphrase' : 'environment',
  environmentKey: settings.masterKeyEncoded === null ? null : parseEncodedKey(settings.masterKeyEncoded),
})

const app = createApp({
  vault,
  repositories: loadRepositories(settings.repositoriesFile),
  secretDefinitions,
  testSecret: testSecretAgainstProvider,
  createGraphqlFetcher: createGithubGraphqlFetcher,
  allowedHostNames: settings.allowedHostNames,
  boardCacheMilliseconds: 60_000,
  now: Date.now,
})

const webRoot = relative(process.cwd(), settings.webDistDirectory)
app.use('/*', serveStatic({ root: webRoot }))
app.get('*', serveStatic({ path: join(webRoot, 'index.html') }))

const server = serve({ fetch: app.fetch, hostname: settings.host, port: settings.port }, (address) => {
  process.stdout.write(`agent-dashboard listening on http://localhost:${address.port} (vault: ${vault.readState().mode})\n`)
})

const shutDown = (): void => {
  server.close(() => {
    database.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)
