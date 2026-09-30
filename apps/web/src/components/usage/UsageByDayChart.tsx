import { Card, Flex, Text, Tooltip } from '@radix-ui/themes'
import type { UsageByDay } from '@agent-dashboard/contracts'
import { formatCompactCount, formatFullCount } from '@/lib/presentation'
import { niceAxisTicks } from '@/lib/usage-chart'

const formatDay = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' })

interface UsageByDayChartProps {
  days: UsageByDay[]
  isStale: boolean
}

/** The tokens-per-day column chart, with a tooltip on every day and the busiest day labelled. */
export const UsageByDayChart = ({ days, isStale }: UsageByDayChartProps) => {
  const axisTicks = niceAxisTicks(Math.max(0, ...days.map((usage) => usage.tokens.total)))
  const axisTop = axisTicks.at(-1) ?? 0
  const heightPercent = (value: number): number => (axisTop > 0 ? (value / axisTop) * 100 : 0)
  const busiestDay = days.reduce<UsageByDay | null>(
    (busiest, usage) => (busiest === null || usage.tokens.total > busiest.tokens.total ? usage : busiest),
    null,
  )
  const labelledDays = new Set([days[0]?.day, days[Math.floor(days.length / 2)]?.day, days.at(-1)?.day])

  return (
    <Card size="2">
      <Flex direction="column" gap="4" className={isStale ? 'chart-stale' : undefined}>
        <Text size="2" weight="medium">
          Tokens per day
        </Text>
        <div className="column-chart">
          <div className="column-chart-plot">
            {axisTicks.map((tickValue) => (
              <div key={tickValue} className="column-chart-gridline" style={{ bottom: `${heightPercent(tickValue)}%` }}>
                <Text size="1" color="gray" className="column-chart-axis-label">
                  {formatCompactCount(tickValue)}
                </Text>
              </div>
            ))}
            <div className="column-chart-columns">
              {days.map((usage) => (
                <div key={usage.day} className="column-chart-slot">
                  {busiestDay?.day === usage.day && usage.tokens.total > 0 && (
                    <Text size="1" className="column-chart-cap-label" style={{ bottom: `${heightPercent(usage.tokens.total)}%` }}>
                      {formatCompactCount(usage.tokens.total)}
                    </Text>
                  )}
                  <Tooltip
                    content={
                      <Flex direction="column" gap="1">
                        <Text weight="bold">{formatFullCount(usage.tokens.total)} tokens</Text>
                        <span>{formatDay(usage.day)}</span>
                      </Flex>
                    }
                  >
                    <button
                      type="button"
                      className="column-chart-hit"
                      aria-label={`${formatDay(usage.day)}: ${formatFullCount(usage.tokens.total)} tokens`}
                    >
                      <span className="column-chart-bar" style={{ height: `${heightPercent(usage.tokens.total)}%` }} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          <div className="column-chart-x-axis" aria-hidden="true">
            {days.map((usage) => (
              <Text key={usage.day} size="1" color="gray" className="column-chart-x-label">
                {labelledDays.has(usage.day) ? formatDay(usage.day) : ''}
              </Text>
            ))}
          </div>
        </div>
      </Flex>
    </Card>
  )
}
