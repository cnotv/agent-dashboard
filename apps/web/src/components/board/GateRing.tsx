import type { CheckGate } from '@dashi/contracts'
import { gateRingSegments } from '@/lib/gate-ring'
import { gateRingColors } from '@/lib/presentation'

const ringSize = 18
const ringCenter = ringSize / 2
const ringStrokeWidth = 3
const ringRadius = ringCenter - ringStrokeWidth / 2
const ringCircumference = 2 * Math.PI * ringRadius
// A sliver of the surface between arcs keeps two neighbouring colours apart.
const arcGapLength = 1.5
const shortestArcLength = 1

/**
 * A ring split into one coloured arc per check state, each as long as its share of the checks.
 * With no checks only the grey track shows.
 */
export const GateRing = ({ gates }: { gates: CheckGate[] }) => {
  const segments = gateRingSegments(gates)
  const gapLength = segments.length > 1 ? arcGapLength : 0
  return (
    <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
      <circle cx={ringCenter} cy={ringCenter} r={ringRadius} fill="none" stroke="var(--gray-a4)" strokeWidth={ringStrokeWidth} />
      {segments.map((segment) => (
        <circle
          key={segment.group}
          cx={ringCenter}
          cy={ringCenter}
          r={ringRadius}
          fill="none"
          stroke={gateRingColors[segment.group]}
          strokeWidth={ringStrokeWidth}
          strokeDasharray={`${Math.max(segment.lengthFraction * ringCircumference - gapLength, shortestArcLength)} ${ringCircumference}`}
          strokeDashoffset={-segment.startFraction * ringCircumference}
          transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
        />
      ))}
    </svg>
  )
}
