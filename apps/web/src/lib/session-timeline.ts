import type { AgentSessionState, AgentSessionSummary, SessionsOverview } from '@agent-dashboard/contracts'
import type { ChartedSessionState, SessionTimelineLayout, TimeTick, TimelineLane } from './types'

const hourMilliseconds = 60 * 60_000
const tickStepHours = [1, 2, 3, 6, 12, 24]
const maximumTickCount = 6
const chartedStates: ChartedSessionState[] = ['working', 'waiting', 'idle']

export const sessionStateOrder: Record<AgentSessionState, number> = { working: 0, waiting: 1, idle: 2, inactive: 3, ended: 4 }

export const isChartedState = (state: AgentSessionState): state is ChartedSessionState =>
  chartedStates.some((chartedState) => chartedState === state)

export const isOngoing = (session: AgentSessionSummary): boolean => isChartedState(session.state)

const shortSessionId = (sessionId: string): string => sessionId.slice(0, 8)

export const sessionLabel = (session: AgentSessionSummary): string =>
  session.repository === null ? `Session ${shortSessionId(session.sessionId)}` : session.repository.name

export const sessionDetail = (session: AgentSessionSummary): string => session.branch ?? shortSessionId(session.sessionId)

const percentOf = (milliseconds: number, windowStart: number, windowLength: number): number =>
  Math.min(100, Math.max(0, ((milliseconds - windowStart) / windowLength) * 100))

// The step is the smallest one that keeps the axis to a handful of labels, and every tick sits
// on a whole hour so the labels read as clock times.
export const buildTimeTicks = (
  windowStartedAt: string,
  generatedAt: string,
  formatTime: (isoTime: string) => string,
): TimeTick[] => {
  const windowStart = Date.parse(windowStartedAt)
  const windowEnd = Date.parse(generatedAt)
  const windowLength = Math.max(1, windowEnd - windowStart)
  const stepHours = tickStepHours.find((hours) => windowLength / (hours * hourMilliseconds) <= maximumTickCount) ?? 24
  const stepMilliseconds = stepHours * hourMilliseconds
  const firstTick = Math.ceil(windowStart / stepMilliseconds) * stepMilliseconds
  const tickCount = Math.max(0, Math.floor((windowEnd - firstTick) / stepMilliseconds) + 1)
  return Array.from({ length: tickCount }, (_, tickIndex) => {
    const tickTime = new Date(firstTick + tickIndex * stepMilliseconds).toISOString()
    return { tickKey: tickTime, label: formatTime(tickTime), leftPercent: percentOf(Date.parse(tickTime), windowStart, windowLength) }
  })
}

export const layoutSessionTimeline = (
  overview: SessionsOverview,
  formatTime: (isoTime: string) => string,
): SessionTimelineLayout => {
  const windowStart = Date.parse(overview.windowStartedAt)
  const windowLength = Math.max(1, Date.parse(overview.generatedAt) - windowStart)
  const lanes = overview.sessions.filter(isOngoing).map(
    (session): TimelineLane => ({
      sessionId: session.sessionId,
      label: sessionLabel(session),
      detail: sessionDetail(session),
      state: session.state,
      bars: overview.timeline
        .filter((segment) => segment.sessionId === session.sessionId)
        .flatMap((segment) => {
          if (!isChartedState(segment.state)) return []
          const leftPercent = percentOf(Date.parse(segment.startedAt), windowStart, windowLength)
          const widthPercent = percentOf(Date.parse(segment.endedAt), windowStart, windowLength) - leftPercent
          return widthPercent > 0
            ? [{ barKey: segment.startedAt, state: segment.state, startedAt: segment.startedAt, endedAt: segment.endedAt, leftPercent, widthPercent }]
            : []
        }),
    }),
  )
  return { lanes, ticks: buildTimeTicks(overview.windowStartedAt, overview.generatedAt, formatTime) }
}
