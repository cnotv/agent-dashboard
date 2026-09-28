import { Badge, Flex, Text, Tooltip } from '@radix-ui/themes'
import type { CheckGate, GateSummary } from '@agent-dashboard/contracts'
import { gateOverallLabels, gateStateColors } from '@/lib/presentation'

export const GateStrip = ({ gates, summary }: { gates: CheckGate[]; summary: GateSummary }) => (
  <Flex direction="column" gap="2">
    <Text size="1" color="gray">
      {gateOverallLabels[summary.overallState]}
      {summary.total > 0 ? ` · ${summary.passed}/${summary.total}` : ''}
    </Text>
    {gates.length > 0 && (
      <Flex gap="1" wrap="wrap">
        {gates.map((gate) => (
          <Tooltip key={gate.name} content={`${gate.name}: ${gate.state}`}>
            <Badge color={gateStateColors[gate.state]} variant="soft" radius="full" asChild={gate.url !== null}>
              {gate.url === null ? (
                gate.name
              ) : (
                <a href={gate.url} target="_blank" rel="noopener noreferrer">
                  {gate.name}
                </a>
              )}
            </Badge>
          </Tooltip>
        ))}
      </Flex>
    )}
  </Flex>
)
