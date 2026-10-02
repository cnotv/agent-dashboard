import { Hono, type Context } from 'hono'
import type { SessionStart } from '@dashi/contracts'
import { effectiveState } from '../activity/aggregate.ts'
import type { ActivityStore } from '../activity/types.ts'
import { limitTo, readJsonBody } from '../app/http.ts'
import type { AppEnvironment } from '../app/types.ts'
import type { MachineTokenStore } from '../machine-tokens/types.ts'
import { createRedactor } from '../secrets/redact.ts'
import type { Vault } from '../secrets/types.ts'
import { createRunnerTokenGuard, isAnyRunnerOnline } from '../session-starts/session-start-routes.ts'
import type { SessionStartStore } from '../session-starts/types.ts'
import { chatMessageBodySchema, deliveryReportSchema, runnerChatReportSchema, sessionIdSchema, startIdSchema } from './schema.ts'
import type { ChatRelay, ChatWorkContext, ChatWorkStart } from './types.ts'

export interface SessionChatRouteDependencies {
  chatRelay: ChatRelay
  activityStore: ActivityStore
  runnerTokens: MachineTokenStore
  startStore: SessionStartStore
  vault: Vault
  now: () => number
}

const unknownSessionError = { error: 'Unknown session' }
const startChatIdPrefix = 'start-'

const chatStartOf = (start: SessionStart): ChatWorkStart | null =>
  start.target === 'laptop-remote-control' || start.target === 'laptop-headless'
    ? { repositoryName: start.repository.name, startId: start.startId, target: start.target }
    : null

const findLaptopStart = (startStore: SessionStartStore, startId: string): ChatWorkStart | null => {
  const start = startStore.listRecentStarts().find((recentStart) => recentStart.startId === startId)
  return start === undefined ? null : chatStartOf(start)
}

/**
 * Builds the chat drawer's routes, for a session by its id or for a laptop start from the board:
 * reading its conversation, which also keeps the runner sending it, and queueing a message for the
 * runner to deliver.
 * @param dependencies The relay, the starts, and the runner tokens that tell whether a laptop is online.
 * @returns The routes, mounted under /api.
 */
export const createSessionChatRoutes = ({ chatRelay, runnerTokens, startStore, now }: SessionChatRouteDependencies) => {
  const routes = new Hono<AppEnvironment>()

  const sessionChatIdOf = (context: Context<AppEnvironment>): string | null => {
    const parsedSessionId = sessionIdSchema.safeParse(context.req.param('sessionId'))
    return parsedSessionId.success && !parsedSessionId.data.startsWith(startChatIdPrefix) ? parsedSessionId.data : null
  }
  // A start is chatted with under its own id until its Claude session is known; only starts that
  // run on the laptop have a transcript the runner can read.
  const startChatIdOf = (context: Context<AppEnvironment>): string | null => {
    const parsedStartId = startIdSchema.safeParse(context.req.param('startId'))
    if (!parsedStartId.success || findLaptopStart(startStore, parsedStartId.data) === null) return null
    return `${startChatIdPrefix}${parsedStartId.data}`
  }

  const addChatRoutes = (path: string, chatIdOf: (context: Context<AppEnvironment>) => string | null): void => {
    routes.get(path, (context) => {
      const chatId = chatIdOf(context)
      if (chatId === null) return context.json(unknownSessionError, 404)
      return context.json(chatRelay.readChat(chatId, isAnyRunnerOnline(runnerTokens, now())))
    })

    routes.post(path, limitTo(16 * 1024), async (context) => {
      const chatId = chatIdOf(context)
      if (chatId === null) return context.json(unknownSessionError, 404)
      const { text } = chatMessageBodySchema.parse(await readJsonBody(context.req.raw))
      const delivery = chatRelay.queueMessage(chatId, text)
      return delivery === null
        ? context.json({ error: 'Too many messages are still waiting for the laptop' }, 429)
        : context.json(delivery, 201)
    })
  }

  addChatRoutes('/sessions/:sessionId/chat', sessionChatIdOf)
  addChatRoutes('/session-starts/:startId/chat', startChatIdOf)

  return routes
}

/**
 * Builds the runner's side of the chat: which sessions to read and which messages to deliver,
 * and the transcripts and delivery results it sends back. Transcripts are scrubbed of every
 * stored secret before the relay holds them.
 * @param dependencies The relay, the activity store for each session's state, the starts, the runner tokens and the vault.
 * @returns The routes, mounted under /api/runner.
 */
export const createRunnerChatRoutes = ({
  chatRelay,
  activityStore,
  runnerTokens,
  startStore,
  vault,
  now,
}: SessionChatRouteDependencies) => {
  const routes = new Hono<AppEnvironment & { Variables: { runnerLabel: string } }>()
  const requireRunnerToken = createRunnerTokenGuard(runnerTokens)

  const contextOf = (chatId: string): ChatWorkContext => {
    if (chatId.startsWith(startChatIdPrefix)) {
      return { sessionState: null, start: findLaptopStart(startStore, chatId.slice(startChatIdPrefix.length)) }
    }
    const storedSession = activityStore.readSessions().find((session) => session.sessionId === chatId)
    return { sessionState: storedSession === undefined ? null : effectiveState(storedSession, now()), start: null }
  }

  routes.post('/chat-work', requireRunnerToken, (context) => context.json(chatRelay.takeWork(contextOf)))

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
