import { Hono } from 'hono'
import type { AgentSessionState } from '@agent-dashboard/contracts'
import { effectiveState } from '../activity/aggregate.ts'
import type { ActivityStore } from '../activity/types.ts'
import { limitTo, readJsonBody } from '../app/http.ts'
import type { AppEnvironment } from '../app/types.ts'
import type { MachineTokenStore } from '../machine-tokens/types.ts'
import { createRedactor } from '../secrets/redact.ts'
import type { Vault } from '../secrets/types.ts'
import { createRunnerTokenGuard, isAnyRunnerOnline } from '../session-starts/session-start-routes.ts'
import { chatMessageBodySchema, deliveryReportSchema, runnerChatReportSchema, sessionIdSchema } from './schema.ts'
import type { ChatRelay } from './types.ts'

export interface SessionChatRouteDependencies {
  chatRelay: ChatRelay
  activityStore: ActivityStore
  runnerTokens: MachineTokenStore
  vault: Vault
  now: () => number
}

const unknownSessionError = { error: 'Unknown session' }

/**
 * Builds the chat drawer's routes: reading a session's conversation, which also keeps the runner
 * sending it, and queueing a message for the runner to deliver.
 * @param dependencies The relay, and the runner tokens that tell whether a laptop is online.
 * @returns The routes, mounted under /api.
 */
export const createSessionChatRoutes = ({ chatRelay, runnerTokens, now }: SessionChatRouteDependencies) => {
  const routes = new Hono<AppEnvironment>()

  routes.get('/sessions/:sessionId/chat', (context) => {
    const parsedSessionId = sessionIdSchema.safeParse(context.req.param('sessionId'))
    if (!parsedSessionId.success) return context.json(unknownSessionError, 404)
    return context.json(chatRelay.readChat(parsedSessionId.data, isAnyRunnerOnline(runnerTokens, now())))
  })

  routes.post('/sessions/:sessionId/chat', limitTo(16 * 1024), async (context) => {
    const parsedSessionId = sessionIdSchema.safeParse(context.req.param('sessionId'))
    if (!parsedSessionId.success) return context.json(unknownSessionError, 404)
    const { text } = chatMessageBodySchema.parse(await readJsonBody(context.req.raw))
    const delivery = chatRelay.queueMessage(parsedSessionId.data, text)
    return delivery === null
      ? context.json({ error: 'Too many messages are still waiting for the laptop' }, 429)
      : context.json(delivery, 201)
  })

  return routes
}

/**
 * Builds the runner's side of the chat: which sessions to read and which messages to deliver,
 * and the transcripts and delivery results it sends back. Transcripts are scrubbed of every
 * stored secret before the relay holds them.
 * @param dependencies The relay, the activity store for each session's state, the runner tokens and the vault.
 * @returns The routes, mounted under /api/runner.
 */
export const createRunnerChatRoutes = ({ chatRelay, activityStore, runnerTokens, vault, now }: SessionChatRouteDependencies) => {
  const routes = new Hono<AppEnvironment & { Variables: { runnerLabel: string } }>()
  const requireRunnerToken = createRunnerTokenGuard(runnerTokens)

  const sessionStateOf = (sessionId: string): AgentSessionState | null => {
    const storedSession = activityStore.readSessions().find((session) => session.sessionId === sessionId)
    return storedSession === undefined ? null : effectiveState(storedSession, now())
  }

  routes.post('/chat-work', requireRunnerToken, (context) => context.json(chatRelay.takeWork(sessionStateOf)))

  routes.post('/chat/:sessionId', requireRunnerToken, limitTo(1024 * 1024), async (context) => {
    const parsedSessionId = sessionIdSchema.safeParse(context.req.param('sessionId'))
    if (!parsedSessionId.success) return context.json(unknownSessionError, 404)
    const report = runnerChatReportSchema.parse(await readJsonBody(context.req.raw))
    const redact = createRedactor(vault.readAllSecretValues())
    const scrubbedReport = { ...report, messages: report.messages.map((message) => ({ ...message, text: redact(message.text) })) }
    return chatRelay.recordTranscript(parsedSessionId.data, scrubbedReport)
      ? context.body(null, 204)
      : context.json({ error: 'Nobody is reading that session' }, 404)
  })

  routes.post('/deliveries/:deliveryId', requireRunnerToken, limitTo(16 * 1024), async (context) => {
    const report = deliveryReportSchema.parse(await readJsonBody(context.req.raw))
    return chatRelay.recordDeliveryReport(context.req.param('deliveryId'), report)
      ? context.body(null, 204)
      : context.json({ error: 'No message is waiting for that report' }, 404)
  })

  return routes
}
