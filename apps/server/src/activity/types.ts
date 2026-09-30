import type { z } from 'zod'
import type {
  AgentProvider,
  AgentSessionState,
  RepositoryReference,
} from '@agent-dashboard/contracts'
import type { MachineTokenStore } from '../machine-tokens/types.ts'
import type { hookPayloadSchema, keyValueSchema, otlpMetricsSchema } from './schema.ts'

export type HookPayload = z.infer<typeof hookPayloadSchema>
export type OtlpMetricsRequest = z.infer<typeof otlpMetricsSchema>
export type OtlpKeyValue = z.infer<typeof keyValueSchema>

export type TokenType = 'input' | 'output' | 'cacheRead' | 'cacheCreation'

export interface HookHeaders {
  provider: string | undefined
  branch: string | undefined
  remote: string | undefined
}

export interface AgentEvent {
  sessionId: string
  provider: AgentProvider
  state: AgentSessionState
  repository: RepositoryReference | null
  branch: string | null
  occurredAt: string
}

export interface TokenUsagePoint {
  sessionId: string
  model: string
  tokenType: TokenType
  value: number
  isCumulative: boolean
  seriesStart: string
  observedAt: string
}

export interface StoredSession {
  sessionId: string
  provider: AgentProvider
  repository: RepositoryReference | null
  branch: string | null
  state: AgentSessionState
  startedAt: string
  lastEventAt: string
}

export interface StoredEvent {
  sessionId: string
  state: AgentSessionState
  occurredAt: string
}

export interface StoredTokenSample {
  sessionId: string
  model: string
  tokenType: TokenType
  tokens: number
  recordedAt: string
}

export interface ActivityStore {
  recordEvent: (event: AgentEvent) => void
  recordTokenUsage: (points: TokenUsagePoint[]) => void
  readSessions: () => StoredSession[]
  readEventsSince: (since: string) => StoredEvent[]
  readTokenSamplesSince: (since: string) => StoredTokenSample[]
}

export interface ActivityDependencies {
  activityStore: ActivityStore
  ingestTokens: MachineTokenStore
  now: () => number
}
