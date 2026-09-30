import { Card, Flex, Link, Text, Tooltip } from '@radix-ui/themes'
import type { SessionsOverview } from '@agent-dashboard/contracts'
import { Link as RouterLink } from 'react-router'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { formatDuration, sessionStateLabels } from '@/lib/presentation'
import { layoutSessionTimeline } from '@/lib/session-timeline'
import type { TimelineBar } from '@/lib/types'

const formatClockTime = (isoTime: string): string =>
  new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// Ticks sit on whole hours, so the axis drops the minutes and stays narrow on a phone.
const formatTickTime = (isoTime: string): string => new Date(isoTime).toLocaleTimeString([], { hour: 'numeric' })

const legendEntries = (['working', 'waiting', 'idle'] as const).map((state) => ({
  entryKey: state,
  label: sessionStateLabels[state],
  swatchClassName: `chart-state-${state}`,
}))

// Past this point a tick label would run into the "Now" label at the right edge.
const lastLabelledTickPercent = 88

const barDescription = (bar: TimelineBar): string =>
  `${sessionStateLabels[bar.state]} for ${formatDuration(Date.parse(bar.endedAt) - Date.parse(bar.startedAt))}, ${formatClockTime(bar.startedAt)} to ${formatClockTime(bar.endedAt)}`

const TimelineBarMark = ({ bar }: { bar: TimelineBar }) => (
  <Tooltip
    content={
      <Flex direction="column" gap="1">
        <Text weight="bold">{formatDuration(Date.parse(bar.endedAt) - Date.parse(bar.startedAt))}</Text>
        <Flex gap="2" align="center">
          <span className={`chart-line-key chart-state-${bar.state}`} aria-hidden="true" />
          <span>
            {sessionStateLabels[bar.state]}, {formatClockTime(bar.startedAt)} to {formatClockTime(bar.endedAt)}
          </span>
        </Flex>
      </Flex>
    }
  >
    <button
      type="button"
      className={`timeline-bar chart-state-${bar.state}`}
      style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
      aria-label={barDescription(bar)}
    />
  </Tooltip>
)

export const SessionTimeline = ({ overview, isStale }: { overview: SessionsOverview; isStale: boolean }) => {
  const { lanes, ticks } = layoutSessionTimeline(overview, formatTickTime)

  return (
    <Card size="2">
      <Flex direction="column" gap="4" className={isStale ? 'chart-stale' : undefined}>
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Text size="2" weight="medium">
            Ongoing sessions over time
          </Text>
          <ChartLegend entries={legendEntries} />
        </Flex>

        {lanes.length === 0 ? (
          <Text size="2" color="gray">
            No session is running right now. A session appears here once its hooks report to this dashboard:{' '}
            <Link asChild>
              <RouterLink to="/credentials">connect Claude Code</RouterLink>
            </Link>
            .
          </Text>
        ) : (
          <div className="timeline">
            {lanes.map((lane) => (
              <div key={lane.sessionId} className="timeline-lane">
                <div className="timeline-lane-label">
                  <Text as="div" size="2" weight="medium" truncate>
                    {lane.label}
                  </Text>
                  <Text as="div" size="1" color="gray" truncate>
                    {lane.detail}
                  </Text>
                </div>
                <div className="timeline-track">
                  {ticks.map((tick) => (
                    <span key={tick.tickKey} className="timeline-gridline" style={{ left: `${tick.leftPercent}%` }} />
                  ))}
                  {lane.bars.map((bar) => (
                    <TimelineBarMark key={bar.barKey} bar={bar} />
                  ))}
                </div>
              </div>
            ))}
            <div className="timeline-lane timeline-axis" aria-hidden="true">
              <span />
              <div className="timeline-track">
                {ticks
                  .filter((tick) => tick.leftPercent <= lastLabelledTickPercent)
                  .map((tick) => (
                  <Text key={tick.tickKey} size="1" color="gray" className="timeline-tick" style={{ left: `${tick.leftPercent}%` }}>
                    {tick.label}
                  </Text>
                ))}
                <Text size="1" color="gray" className="timeline-tick timeline-tick-now">
                  Now
                </Text>
              </div>
            </div>
          </div>
        )}
      </Flex>
    </Card>
  )
}
