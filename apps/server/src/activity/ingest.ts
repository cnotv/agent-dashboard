import type { AgentProvider, AgentSessionState, RepositoryReference } from '@agent-dashboard/contracts'
import type {
  AgentEvent,
  HookHeaders,
  HookPayload,
  OtlpKeyValue,
  OtlpMetricsRequest,
  TokenType,
  TokenUsagePoint,
} from './types.ts'

const tokenUsageMetricName = 'claude_code.token.usage'
const tokenTypes: TokenType[] = ['input', 'output', 'cacheRead', 'cacheCreation']
const cumulativeTemporalities = [2, 'AGGREGATION_TEMPORALITY_CUMULATIVE']

const stateByClaudeHookEvent: Record<string, AgentSessionState> = {
  SessionStart: 'idle',
  UserPromptSubmit: 'working',
  Notification: 'waiting',
  Stop: 'idle',
  SessionEnd: 'ended',
}

// Covers https, ssh and scp-style remotes, and proxy remotes such as
// http://proxy@127.0.0.1:port/git/<owner>/<name>: the last two path segments are the repository.
const remoteRepositoryPattern = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/

export const repositoryFromRemote = (remote: string | undefined): RepositoryReference | null => {
  const remoteMatch = remote === undefined ? null : remoteRepositoryPattern.exec(remote.trim())
  return remoteMatch?.[1] && remoteMatch[2] ? { owner: remoteMatch[1], name: remoteMatch[2] } : null
}

const providerFrom = (value: string | undefined): AgentProvider => (value === 'codex' ? 'codex' : 'claude')

const stateFor = (provider: AgentProvider, payload: HookPayload): AgentSessionState | null => {
  if (provider === 'codex') return payload.type === 'agent-turn-complete' ? 'idle' : null
  return payload.hook_event_name === undefined ? null : (stateByClaudeHookEvent[payload.hook_event_name] ?? null)
}

const emptyToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' || trimmed === 'HEAD' ? null : trimmed
}

export const agentEventFrom = (payload: HookPayload, headers: HookHeaders, occurredAt: string): AgentEvent | null => {
  const provider = providerFrom(headers.provider)
  const sessionId = provider === 'codex' ? payload['thread-id'] : payload.session_id
  const state = stateFor(provider, payload)
  if (sessionId === undefined || state === null) return null
  return {
    sessionId,
    provider,
    state,
    repository: repositoryFromRemote(headers.remote),
    branch: emptyToNull(headers.branch),
    occurredAt,
  }
}

const attributeValue = (attributes: OtlpKeyValue[], key: string): string | null => {
  const found = attributes.find((attribute) => attribute.key === key)?.value
  if (found === undefined) return null
  if (found.stringValue !== undefined) return found.stringValue
  if (found.intValue !== undefined) return String(found.intValue)
  return null
}

const isTokenType = (value: string | null): value is TokenType => tokenTypes.some((tokenType) => tokenType === value)

const nanosecondsToIso = (value: string | number | undefined, fallback: string): string => {
  const milliseconds = Math.floor(Number(value ?? 0) / 1_000_000)
  return Number.isFinite(milliseconds) && milliseconds > 0 ? new Date(milliseconds).toISOString() : fallback
}

export const tokenUsagePointsFrom = (request: OtlpMetricsRequest, receivedAt: string): TokenUsagePoint[] =>
  request.resourceMetrics.flatMap((resourceMetric) =>
    resourceMetric.scopeMetrics.flatMap((scopeMetric) =>
      scopeMetric.metrics
        .filter((metric) => metric.name === tokenUsageMetricName && metric.sum !== undefined)
        .flatMap((metric) => {
          const isCumulative = cumulativeTemporalities.includes(metric.sum?.aggregationTemporality ?? 0)
          return (metric.sum?.dataPoints ?? []).flatMap((dataPoint): TokenUsagePoint[] => {
            const attributes = [...(resourceMetric.resource?.attributes ?? []), ...dataPoint.attributes]
            const sessionId = attributeValue(attributes, 'session.id')
            const tokenType = attributeValue(attributes, 'type')
            const value = Number(dataPoint.asInt ?? dataPoint.asDouble ?? 0)
            if (sessionId === null || !isTokenType(tokenType) || !Number.isFinite(value) || value < 0) return []
            return [
              {
                sessionId,
                model: attributeValue(attributes, 'model') ?? 'unknown',
                tokenType,
                value: Math.round(value),
                isCumulative,
                seriesStart: nanosecondsToIso(dataPoint.startTimeUnixNano, receivedAt),
                observedAt: nanosecondsToIso(dataPoint.timeUnixNano, receivedAt),
              },
            ]
          })
        }),
    ),
  )
