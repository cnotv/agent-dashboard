import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'
import type { AppEnvironment } from '../app/types.ts'
import { buildSessionsOverview, buildUsageReport, type PullRequestFinder } from './aggregate.ts'
import { agentEventFrom, tokenUsagePointsFrom } from './ingest.ts'
import { hookPayloadSchema, otlpMetricsSchema } from './schema.ts'
import type { ActivityDependencies } from './types.ts'

// Reached by Claude Code and Codex rather than a browser, so they carry an ingest token
// instead of a sign-in; the session guard lets exactly these through.
export const ingestApiPaths = ['/api/events', '/api/telemetry/v1/metrics']

const hourMilliseconds = 60 * 60_000
const createTokenBodySchema = z.object({ label: z.string().trim().min(1).max(80) })

const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const bearerTokenOf = (authorizationHeader: string | undefined): string | undefined =>
  authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice('Bearer '.length).trim() : undefined

const clampedNumber = (value: string | undefined, fallback: number, minimum: number, maximum: number): number => {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback
}

const limitTo = (maxSize: number) =>
  bodyLimit({ maxSize, onError: (context) => context.json({ error: 'The body is too large' }, 413) })

export const createIngestRoutes = ({ activityStore, ingestTokens, now }: ActivityDependencies) => {
  const routes = new Hono<AppEnvironment>()
  const requireIngestToken = createMiddleware(async (context, next) =>
    ingestTokens.verifyToken(bearerTokenOf(context.req.header('authorization')))
      ? next()
      : context.json({ error: 'Send a valid ingest token' }, 401),
  )

  routes.post('/events', requireIngestToken, limitTo(64 * 1024), async (context) => {
    const parsedPayload = hookPayloadSchema.safeParse(await readJsonBody(context.req.raw))
    if (!parsedPayload.success) return context.json({ error: 'Unrecognised event' }, 400)
    const event = agentEventFrom(
      parsedPayload.data,
      {
        provider: context.req.header('x-agent-provider'),
        branch: context.req.header('x-agent-branch'),
        remote: context.req.header('x-agent-remote'),
      },
      new Date(now()).toISOString(),
    )
    if (event !== null) activityStore.recordEvent(event)
    return context.body(null, 204)
  })

  routes.post('/telemetry/v1/metrics', requireIngestToken, limitTo(1024 * 1024), async (context) => {
    const parsedRequest = otlpMetricsSchema.safeParse(await readJsonBody(context.req.raw))
    if (!parsedRequest.success) return context.json({ error: 'Not an OTLP metrics request' }, 400)
    activityStore.recordTokenUsage(tokenUsagePointsFrom(parsedRequest.data, new Date(now()).toISOString()))
    // An empty ExportMetricsServiceResponse: everything was accepted.
    return context.json({})
  })

  return routes
}

export const createActivityRoutes = (
  { activityStore, ingestTokens, now }: ActivityDependencies,
  findPullRequest: PullRequestFinder,
) => {
  const routes = new Hono<AppEnvironment>()
  const isoHoursAgo = (hours: number): string => new Date(now() - hours * hourMilliseconds).toISOString()

  routes.get('/sessions', (context) => {
    const windowStartedAt = isoHoursAgo(clampedNumber(context.req.query('hours'), 24, 1, 24 * 7))
    return context.json(
      buildSessionsOverview(
        activityStore.readSessions(),
        activityStore.readEventsSince(windowStartedAt),
        activityStore.readTokenSamplesSince(windowStartedAt),
        windowStartedAt,
        now(),
      ),
    )
  })

  routes.get('/usage', (context) => {
    const windowStartedAt = isoHoursAgo(clampedNumber(context.req.query('days'), 30, 1, 90) * 24)
    return context.json(
      buildUsageReport(
        activityStore.readSessions(),
        activityStore.readTokenSamplesSince(windowStartedAt),
        findPullRequest,
        windowStartedAt,
        now(),
      ),
    )
  })

  routes.get('/ingest-tokens', (context) => context.json(ingestTokens.listTokens()))

  routes.post('/ingest-tokens', async (context) => {
    const { label } = createTokenBodySchema.parse(await readJsonBody(context.req.raw))
    return context.json(ingestTokens.createToken(label), 201)
  })

  routes.delete('/ingest-tokens/:tokenId', (context) => {
    ingestTokens.revokeToken(context.req.param('tokenId'))
    return context.body(null, 204)
  })

  return routes
}
