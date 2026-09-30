import type {
  AgentSessionState,
  AgentSessionSummary,
  IngestTokenSummary,
  SessionTimelineSegment,
  SessionsOverview,
  TokenTotals,
  UsageReport,
} from '@agent-dashboard/contracts'
import { sampleRepositories } from './sample-data'

const minuteMilliseconds = 60_000
const hourMilliseconds = 60 * minuteMilliseconds
const dayMilliseconds = 24 * hourMilliseconds

const [firstRepository, secondRepository] = sampleRepositories

const tokensOf = (input: number, output: number, cacheRead: number, cacheCreation: number): TokenTotals => ({
  input,
  output,
  cacheRead,
  cacheCreation,
  total: input + output + cacheRead + cacheCreation,
})

const addTokens = (first: TokenTotals, second: TokenTotals): TokenTotals =>
  tokensOf(
    first.input + second.input,
    first.output + second.output,
    first.cacheRead + second.cacheRead,
    first.cacheCreation + second.cacheCreation,
  )

// Each sample session is a list of [minutes ago, state] changes, newest last.
interface SampleSession {
  sessionId: string
  repositoryIndex: number | null
  branch: string | null
  issueNumber: number | null
  changes: [number, AgentSessionState][]
  tokens: TokenTotals
}

const sampleSessions: SampleSession[] = [
  {
    sessionId: 'c1a7e3d2-demo-working',
    repositoryIndex: 0,
    branch: 'feat/12-sessions-and-usage',
    issueNumber: 12,
    changes: [[310, 'idle'], [305, 'working'], [240, 'waiting'], [228, 'working'], [150, 'idle'], [95, 'working']],
    tokens: tokensOf(48_200, 131_900, 3_904_000, 212_400),
  },
  {
    sessionId: 'b9f04c11-demo-waiting',
    repositoryIndex: 1,
    branch: 'fix/31-retry-webhooks',
    issueNumber: 31,
    changes: [[180, 'idle'], [176, 'working'], [120, 'idle'], [70, 'working'], [12, 'waiting']],
    tokens: tokensOf(21_800, 64_300, 1_720_500, 98_100),
  },
  {
    sessionId: '5e2d8a90-demo-idle',
    repositoryIndex: 0,
    branch: 'docs/9-deploy-guide',
    issueNumber: 9,
    changes: [[620, 'idle'], [612, 'working'], [540, 'idle'], [300, 'working'], [262, 'idle']],
    tokens: tokensOf(9_400, 27_600, 684_000, 41_900),
  },
  {
    sessionId: '7ac3f5b8-demo-codex',
    repositoryIndex: 1,
    branch: 'main',
    issueNumber: null,
    changes: [[80, 'idle'], [44, 'idle']],
    tokens: tokensOf(0, 0, 0, 0),
  },
  {
    sessionId: 'e4410c6f-demo-ended',
    repositoryIndex: 0,
    branch: 'chore/7-bump-dependencies',
    issueNumber: 7,
    changes: [[1_100, 'idle'], [1_095, 'working'], [1_010, 'idle'], [1_000, 'ended']],
    tokens: tokensOf(6_100, 18_900, 402_300, 30_200),
  },
]

const repositoryAt = (repositoryIndex: number | null) =>
  repositoryIndex === null ? null : (sampleRepositories[repositoryIndex] ?? null)

const isoMinutesAgo = (now: number, minutesAgo: number): string => new Date(now - minutesAgo * minuteMilliseconds).toISOString()

const segmentsOf = (sample: SampleSession, now: number): SessionTimelineSegment[] =>
  sample.changes.flatMap(([minutesAgo, state], changeIndex): SessionTimelineSegment[] => {
    const nextChange = sample.changes[changeIndex + 1]
    if (state === 'ended') return []
    return [
      {
        sessionId: sample.sessionId,
        state,
        startedAt: isoMinutesAgo(now, minutesAgo),
        endedAt: isoMinutesAgo(now, nextChange === undefined ? 0 : nextChange[0]),
      },
    ]
  })

const summaryOf = (sample: SampleSession, now: number): AgentSessionSummary => {
  const firstChange = sample.changes[0]
  const lastChange = sample.changes.at(-1)
  return {
    sessionId: sample.sessionId,
    provider: sample.sessionId.includes('codex') ? 'codex' : 'claude',
    repository: repositoryAt(sample.repositoryIndex),
    branch: sample.branch,
    issueNumber: sample.issueNumber,
    state: lastChange?.[1] ?? 'idle',
    startedAt: isoMinutesAgo(now, firstChange?.[0] ?? 0),
    lastEventAt: isoMinutesAgo(now, lastChange?.[0] ?? 0),
    tokens: sample.tokens,
  }
}

export const sampleSessionsOverview = (hours: number, now: number): SessionsOverview => {
  const windowStartedAt = new Date(now - hours * hourMilliseconds).toISOString()
  const summaries = sampleSessions.map((sample) => summaryOf(sample, now)).filter((session) => session.lastEventAt >= windowStartedAt)
  const includedIds = new Set(summaries.map((session) => session.sessionId))
  return {
    sessions: summaries,
    timeline: sampleSessions
      .filter((sample) => includedIds.has(sample.sessionId))
      .flatMap((sample) => segmentsOf(sample, now))
      .map((segment) => ({ ...segment, startedAt: segment.startedAt < windowStartedAt ? windowStartedAt : segment.startedAt }))
      .filter((segment) => segment.endedAt > segment.startedAt),
    windowStartedAt,
    generatedAt: new Date(now).toISOString(),
  }
}

// A repeatable weekly rhythm rather than random numbers, so every reload shows the same chart.
const dailyScale = [0.2, 1, 0.85, 1.3, 0.7, 1.1, 0]

export const sampleUsageReport = (days: number, now: number): UsageReport => {
  const windowStartedAt = new Date(now - days * dayMilliseconds).toISOString()
  const byDay = Array.from({ length: days }, (_, dayIndex) => {
    const scale = dailyScale[dayIndex % dailyScale.length] ?? 0
    return {
      day: new Date(now - (days - 1 - dayIndex) * dayMilliseconds).toISOString().slice(0, 10),
      tokens: tokensOf(Math.round(12_000 * scale), Math.round(35_000 * scale), Math.round(910_000 * scale), Math.round(52_000 * scale)),
    }
  }).filter((usage) => usage.tokens.total > 0)
  const totals = byDay.reduce((sum, usage) => addTokens(sum, usage.tokens), tokensOf(0, 0, 0, 0))
  const scaled = (share: number): TokenTotals =>
    tokensOf(
      Math.round(totals.input * share),
      Math.round(totals.output * share),
      Math.round(totals.cacheRead * share),
      Math.round(totals.cacheCreation * share),
    )
  return {
    windowStartedAt,
    generatedAt: new Date(now).toISOString(),
    totals,
    sessionCount: 23,
    byRepository: [
      { repository: firstRepository ?? null, tokens: scaled(0.64), sessionCount: 15 },
      { repository: secondRepository ?? null, tokens: scaled(0.31), sessionCount: 6 },
      { repository: null, tokens: scaled(0.05), sessionCount: 2 },
    ],
    byWork: [
      { repository: firstRepository ?? null, branch: 'feat/12-sessions-and-usage', issueNumber: 12, pullRequestNumber: 14, tokens: scaled(0.38), sessionCount: 6 },
      { repository: secondRepository ?? null, branch: 'fix/31-retry-webhooks', issueNumber: 31, pullRequestNumber: 33, tokens: scaled(0.21), sessionCount: 4 },
      { repository: firstRepository ?? null, branch: 'docs/9-deploy-guide', issueNumber: 9, pullRequestNumber: null, tokens: scaled(0.17), sessionCount: 5 },
      { repository: secondRepository ?? null, branch: 'main', issueNumber: null, pullRequestNumber: null, tokens: scaled(0.1), sessionCount: 2 },
      { repository: firstRepository ?? null, branch: 'chore/7-bump-dependencies', issueNumber: 7, pullRequestNumber: 8, tokens: scaled(0.09), sessionCount: 4 },
      { repository: null, branch: null, issueNumber: null, pullRequestNumber: null, tokens: scaled(0.05), sessionCount: 2 },
    ],
    byDay,
    byModel: [
      { model: 'claude-opus-demo', tokens: scaled(0.72) },
      { model: 'claude-haiku-demo', tokens: scaled(0.28) },
    ],
  }
}

export const sampleIngestTokens: IngestTokenSummary[] = [
  { tokenId: 'demo-laptop', label: 'Laptop', createdAt: '2026-09-20T09:00:00Z', lastUsedAt: '2026-09-29T08:40:00Z' },
]
