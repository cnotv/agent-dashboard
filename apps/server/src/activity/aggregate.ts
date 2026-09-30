import type {
  AgentSessionState,
  AgentSessionSummary,
  RepositoryReference,
  SessionTimelineSegment,
  SessionsOverview,
  TokenTotals,
  UsageByDay,
  UsageByModel,
  UsageByRepository,
  UsageByWork,
  UsageReport,
} from '@agent-dashboard/contracts'
import { issueNumberFromBranch } from '../github/status.ts'
import type { StoredEvent, StoredSession, StoredTokenSample } from './types.ts'

// A session that has said nothing for this long is not running any more, even though it never
// sent SessionEnd: a closed laptop or a killed terminal never does.
export const inactiveAfterMilliseconds = 6 * 60 * 60_000

export const emptyTokenTotals = (): TokenTotals => ({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0, total: 0 })

export const sumTokens = (samples: StoredTokenSample[]): TokenTotals =>
  samples.reduce(
    (totals, sample) => ({ ...totals, [sample.tokenType]: totals[sample.tokenType] + sample.tokens, total: totals.total + sample.tokens }),
    emptyTokenTotals(),
  )

export const effectiveState = (session: StoredSession, now: number): AgentSessionState =>
  session.state !== 'ended' && now - Date.parse(session.lastEventAt) > inactiveAfterMilliseconds ? 'inactive' : session.state

const groupBy = <Item>(items: Item[], keyOf: (item: Item) => string): Map<string, Item[]> =>
  items.reduce((groups, item) => groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]), new Map<string, Item[]>())

const latest = (first: string, second: string): string => (first > second ? first : second)
const earliest = (first: string, second: string): string => (first < second ? first : second)

// Each event starts a stretch of its state that lasts until the next event. The last one runs
// until now, or until the session is taken for inactive; an ended session draws nothing after it.
export const buildTimeline = (events: StoredEvent[], windowStartedAt: string, now: number): SessionTimelineSegment[] =>
  [...groupBy(events, (event) => event.sessionId).values()].flatMap((sessionEvents) =>
    sessionEvents
      .map((event, index): SessionTimelineSegment | null => {
        if (event.state === 'ended') return null
        const nextEvent = sessionEvents[index + 1]
        const openEnd = new Date(Math.min(now, Date.parse(event.occurredAt) + inactiveAfterMilliseconds)).toISOString()
        const endedAt = nextEvent === undefined ? openEnd : earliest(nextEvent.occurredAt, openEnd)
        const startedAt = latest(event.occurredAt, windowStartedAt)
        return endedAt > startedAt ? { sessionId: event.sessionId, state: event.state, startedAt, endedAt } : null
      })
      .filter((segment): segment is SessionTimelineSegment => segment !== null),
  )

const stateOrder: Record<AgentSessionState, number> = { working: 0, waiting: 1, idle: 2, inactive: 3, ended: 4 }

export const buildSessionsOverview = (
  sessions: StoredSession[],
  events: StoredEvent[],
  samples: StoredTokenSample[],
  windowStartedAt: string,
  now: number,
): SessionsOverview => {
  const samplesBySession = groupBy(samples, (sample) => sample.sessionId)
  const summaries = sessions
    .filter((session) => session.lastEventAt >= windowStartedAt)
    .map(
      (session): AgentSessionSummary => ({
        sessionId: session.sessionId,
        provider: session.provider,
        repository: session.repository,
        branch: session.branch,
        issueNumber: session.branch === null ? null : issueNumberFromBranch(session.branch),
        state: effectiveState(session, now),
        startedAt: session.startedAt,
        lastEventAt: session.lastEventAt,
        tokens: sumTokens(samplesBySession.get(session.sessionId) ?? []),
      }),
    )
    .sort((first, second) => stateOrder[first.state] - stateOrder[second.state] || (first.lastEventAt < second.lastEventAt ? 1 : -1))
  return {
    sessions: summaries,
    timeline: buildTimeline(events, windowStartedAt, now),
    windowStartedAt,
    generatedAt: new Date(now).toISOString(),
  }
}

const repositoryKey = (repository: RepositoryReference | null): string =>
  repository === null ? '' : `${repository.owner}/${repository.name}`

const byTotalDescending = <Row extends { tokens: TokenTotals }>(first: Row, second: Row): number =>
  second.tokens.total - first.tokens.total

export type PullRequestFinder = (repository: RepositoryReference, branch: string) => number | null

export const buildUsageReport = (
  sessions: StoredSession[],
  samples: StoredTokenSample[],
  findPullRequest: PullRequestFinder,
  windowStartedAt: string,
  now: number,
): UsageReport => {
  const sessionsById = new Map(sessions.map((session) => [session.sessionId, session]))
  const sessionOf = (sample: StoredTokenSample): StoredSession | undefined => sessionsById.get(sample.sessionId)
  const distinctSessions = (group: StoredTokenSample[]): number => new Set(group.map((sample) => sample.sessionId)).size
  const firstSessionOf = (group: StoredTokenSample[]): StoredSession | undefined =>
    group[0] === undefined ? undefined : sessionOf(group[0])

  const byRepository = [...groupBy(samples, (sample) => repositoryKey(sessionOf(sample)?.repository ?? null)).values()]
    .map(
      (group): UsageByRepository => ({
        repository: firstSessionOf(group)?.repository ?? null,
        tokens: sumTokens(group),
        sessionCount: distinctSessions(group),
      }),
    )
    .sort(byTotalDescending)

  const workKey = (sample: StoredTokenSample): string => {
    const session = sessionOf(sample)
    return `${repositoryKey(session?.repository ?? null)}#${session?.branch ?? ''}`
  }
  const byWork = [...groupBy(samples, workKey).values()]
    .map((group): UsageByWork => {
      const session = firstSessionOf(group)
      const repository = session?.repository ?? null
      const branch = session?.branch ?? null
      return {
        repository,
        branch,
        issueNumber: branch === null ? null : issueNumberFromBranch(branch),
        pullRequestNumber: repository === null || branch === null ? null : findPullRequest(repository, branch),
        tokens: sumTokens(group),
        sessionCount: distinctSessions(group),
      }
    })
    .sort(byTotalDescending)

  const byDay = [...groupBy(samples, (sample) => sample.recordedAt.slice(0, 10)).entries()]
    .map(([day, group]): UsageByDay => ({ day, tokens: sumTokens(group) }))
    .sort((first, second) => (first.day < second.day ? -1 : 1))

  const byModel = [...groupBy(samples, (sample) => sample.model).entries()]
    .map(([model, group]): UsageByModel => ({ model, tokens: sumTokens(group) }))
    .sort(byTotalDescending)

  return {
    windowStartedAt,
    generatedAt: new Date(now).toISOString(),
    totals: sumTokens(samples),
    sessionCount: distinctSessions(samples),
    byRepository,
    byWork,
    byDay,
    byModel,
  }
}
