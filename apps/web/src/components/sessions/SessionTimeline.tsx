import { Flex, Text, Tooltip } from '@radix-ui/themes'
import { formatDuration, sessionStateLabels } from '@/lib/presentation'
import type { TimeTick, TimelineBar, TimelineLane } from '@/lib/types'

const formatClockTime = (isoTime: string): string =>
  new Date(isoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * Writes an axis tick's time. Ticks sit on whole hours, so the axis drops the minutes and stays
 * narrow on a phone.
 * @param isoTime The tick's time.
 * @returns The hour.
 */
export const formatTickTime = (isoTime: string): string => new Date(isoTime).toLocaleTimeString([], { hour: 'numeric' })

export const timelineLegendEntries = (['working', 'waiting', 'idle'] as const).map((state) => ({
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
      <Flex as="span" direction="column" gap="1">
        <Text weight="bold">{formatDuration(Date.parse(bar.endedAt) - Date.parse(bar.startedAt))}</Text>
        <Flex as="span" gap="2" align="center">
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

/** One session's stretches over the window, coloured by state, with a tooltip on each. */
export const SessionTimelineTrack = ({ lane, ticks }: { lane: TimelineLane; ticks: TimeTick[] }) => (
  <div className="timeline-track">
    {ticks.map((tick) => (
      <span key={tick.tickKey} className="timeline-gridline" style={{ left: `${tick.leftPercent}%` }} />
    ))}
    {lane.bars.map((bar) => (
      <TimelineBarMark key={bar.barKey} bar={bar} />
    ))}
  </div>
)

/** The window's time axis, read against every track below it. */
export const SessionTimelineAxis = ({ ticks }: { ticks: TimeTick[] }) => (
  <div className="timeline-track timeline-axis" aria-hidden="true">
    {ticks
      .filter((tick) => tick.leftPercent <= lastLabelledTickPercent)
      .map((tick) => (
        <Text key={tick.tickKey} size="1" color="gray" weight="regular" className="timeline-tick" style={{ left: `${tick.leftPercent}%` }}>
          {tick.label}
        </Text>
      ))}
    <Text size="1" color="gray" weight="regular" className="timeline-tick timeline-tick-now">
      Now
    </Text>
  </div>
)
