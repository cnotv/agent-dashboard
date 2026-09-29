import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import type { Board } from '@agent-dashboard/contracts'
import { authCookieNamesFor, createAuthRoutes, publicApiPaths } from '../auth/auth-routes.ts'
import { fetchRepositoryBoard } from '../github/board.ts'
import { findRepository } from '../repos/load-repositories.ts'
import { isAllowedHostHeader, isSameOriginRequest } from '../runtime/settings.ts'
import { createRedactor } from '../secrets/redact.ts'
import type { AppDependencies, AppEnvironment } from './types.ts'

const passphraseBodySchema = z.object({ passphrase: z.string().min(1) })
const secretBodySchema = z.object({ value: z.string().min(1).max(4096) })
const rotateBodySchema = z.object({ nextKey: z.string().min(1) })

const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const createApp = (dependencies: AppDependencies): Hono<AppEnvironment> => {
  const { vault, auth, repositories, secretDefinitions } = dependencies
  const sessionCookieName = authCookieNamesFor(auth.secureCookies).session
  const boardCache = new Map<string, { board: Board; storedAt: number }>()
  const app = new Hono<AppEnvironment>()

  app.use('/api/*', async (context, next) => {
    const hostHeader = context.req.header('host')
    if (!isAllowedHostHeader(hostHeader, dependencies.allowedHostNames)) return context.json({ error: 'Unknown host' }, 403)
    const isMutation = context.req.method !== 'GET' && context.req.method !== 'HEAD'
    if (isMutation && !isSameOriginRequest(context.req.header('origin'), hostHeader)) {
      return context.json({ error: 'Cross-origin request refused' }, 403)
    }
    if (isMutation && !(context.req.header('content-type') ?? '').startsWith('application/json')) {
      return context.json({ error: 'Send JSON' }, 415)
    }
    return next()
  })

  app.use('/api/*', async (context, next) => {
    const session = auth.sessionStore.readSession(getCookie(context, sessionCookieName))
    context.set('session', session)
    if (auth.signInRequired && session === null && !publicApiPaths.includes(context.req.path)) {
      return context.json({ error: 'Sign in with GitHub first' }, 401)
    }
    return next()
  })

  app.onError((error, context) => {
    const session = context.get('session')
    const redact = createRedactor([...vault.readAllSecretValues(), ...(session ? [session.githubToken] : [])])
    return context.json({ error: redact(error.message) }, 400)
  })

  app.route('/api/auth', createAuthRoutes(auth))

  app.get('/api/health', (context) => context.json({ ok: true }))

  app.get('/api/vault', (context) => context.json(vault.readState()))

  app.post('/api/vault/setup', async (context) => {
    const { passphrase } = passphraseBodySchema.parse(await readJsonBody(context.req.raw))
    vault.initialise(passphrase)
    return context.json(vault.readState())
  })

  app.post('/api/vault/unlock', async (context) => {
    const { passphrase } = passphraseBodySchema.parse(await readJsonBody(context.req.raw))
    vault.unlock(passphrase)
    return context.json(vault.readState())
  })

  app.post('/api/vault/lock', (context) => {
    vault.lock()
    return context.json(vault.readState())
  })

  app.post('/api/vault/rotate', async (context) => {
    const { nextKey } = rotateBodySchema.parse(await readJsonBody(context.req.raw))
    vault.rotate(nextKey)
    return context.json(vault.readState())
  })

  const findDefinition = (name: string) => secretDefinitions.find((definition) => definition.name === name)

  app.get('/api/secrets', (context) =>
    context.json(vault.listSecrets(secretDefinitions.map(({ name, label, description }) => ({ name, label, description })))),
  )

  app.put('/api/secrets/:name', async (context) => {
    const secretName = context.req.param('name')
    if (findDefinition(secretName) === undefined) return context.json({ error: 'Unknown secret' }, 404)
    const { value } = secretBodySchema.parse(await readJsonBody(context.req.raw))
    vault.saveSecret(secretName, value)
    boardCache.clear()
    return context.body(null, 204)
  })

  app.delete('/api/secrets/:name', (context) => {
    vault.deleteSecret(context.req.param('name'))
    boardCache.clear()
    return context.body(null, 204)
  })

  app.post('/api/secrets/:name/test', async (context) => {
    const definition = findDefinition(context.req.param('name'))
    if (definition === undefined) return context.json({ error: 'Unknown secret' }, 404)
    const secretValue = vault.readSecretValue(definition.name)
    if (secretValue === null) return context.json({ ok: false, status: null, message: 'Not set' })
    return context.json(await dependencies.testSecret(definition, secretValue))
  })

  app.get('/api/repositories', (context) => context.json(repositories))

  app.get('/api/repositories/:owner/:name/board', async (context) => {
    const repository = findRepository(repositories, context.req.param('owner'), context.req.param('name'))
    if (repository === undefined) return context.json({ error: 'Unknown repository' }, 404)
    const session = context.get('session')
    // Each signed-in user sees the board through their own token, so the cache is per reader.
    const cacheKey = `${session?.user.login ?? '(stored token)'}:${repository.owner}/${repository.name}`
    const cachedBoard = boardCache.get(cacheKey)
    const wantsFresh = context.req.query('refresh') === '1'
    if (cachedBoard && !wantsFresh && dependencies.now() - cachedBoard.storedAt < dependencies.boardCacheMilliseconds) {
      return context.json(cachedBoard.board)
    }
    const githubToken = session?.githubToken ?? vault.readSecretValue('github-token')
    if (githubToken === null) {
      return context.json({ error: 'Sign in with GitHub, or save a GitHub token under Credentials' }, 412)
    }
    const board = await fetchRepositoryBoard(dependencies.createGraphqlFetcher(githubToken), repository)
    boardCache.set(cacheKey, { board, storedAt: dependencies.now() })
    return context.json(board)
  })

  return app
}
