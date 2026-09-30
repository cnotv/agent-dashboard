import { Button, Flex, HoverCard, Link, Text } from '@radix-ui/themes'
import type { CheckGate, GateSummary } from '@agent-dashboard/contracts'
import { gateRingGroupOf } from '@/lib/gate-ring'
import { gateOverallColors, gateOverallLabels, gateRingColors, gateStateLabels } from '@/lib/presentation'
import { GateRing } from './GateRing'

const dotSize = 8

const GateDot = ({ gate }: { gate: CheckGate }) => (
  <svg width={dotSize} height={dotSize} aria-hidden="true">
    <circle cx={dotSize / 2} cy={dotSize / 2} r={dotSize / 2} fill={gateRingColors[gateRingGroupOf(gate.state)]} />
  </svg>
)

/**
 * A pull request's checks as a coloured ring and the passed count. Hovering or focusing the
 * count lists every check with its state and a link to its run.
 */
export const GateIndicator = ({ gates, summary }: { gates: CheckGate[]; summary: GateSummary }) => {
  const countText = summary.total === 0 ? gateOverallLabels.none : `${summary.passed}/${summary.total}`
  const indicator = (
    <Flex gap="2" align="center">
      <GateRing gates={gates} />
      <Text size="1" weight="medium" color={gateOverallColors[summary.overallState]}>
        {countText}
      </Text>
    </Flex>
  )
  if (gates.length === 0) return indicator
  return (
    <HoverCard.Root openDelay={150} closeDelay={200}>
      <HoverCard.Trigger>
        <Button size="1" variant="ghost" color="gray" aria-label={`${gateOverallLabels[summary.overallState]}, ${countText} passed`}>
          {indicator}
        </Button>
      </HoverCard.Trigger>
      <HoverCard.Content size="1" maxWidth="320px">
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium" color={gateOverallColors[summary.overallState]}>
            {gateOverallLabels[summary.overallState]}
          </Text>
          {gates.map((gate) => (
            <Flex key={gate.name} gap="2" align="center" justify="between">
              <Flex gap="2" align="center" minWidth="0">
                <GateDot gate={gate} />
                {gate.url === null ? (
                  <Text size="1" truncate>
                    {gate.name}
                  </Text>
                ) : (
                  <Link href={gate.url} target="_blank" rel="noopener noreferrer" size="1" truncate>
                    {gate.name}
                  </Link>
                )}
              </Flex>
              <Text size="1" color="gray">
                {gateStateLabels[gate.state]}
              </Text>
            </Flex>
          ))}
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  )
}
