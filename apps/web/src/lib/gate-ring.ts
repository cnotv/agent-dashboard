import type { CheckGate, GateState } from '@agent-dashboard/contracts'
import type { GateRingGroup, GateRingSegment } from './types'

// Failures come first, so they start at twelve o'clock where the eye lands.
const gateRingOrder: GateRingGroup[] = ['failure', 'pending', 'success', 'other']

const ringGroupOf: Record<GateState, GateRingGroup> = {
  failure: 'failure',
  pending: 'pending',
  success: 'success',
  neutral: 'other',
  skipped: 'other',
}

/**
 * Splits a ring into one arc per group of check states, each as long as its share of the checks.
 * @param gates The pull request's check gates.
 * @returns The arcs in drawing order, as fractions of the full circle; empty when there are no checks.
 */
export const gateRingSegments = (gates: CheckGate[]): GateRingSegment[] =>
  gateRingOrder
    .map((group) => ({ group, gateCount: gates.filter((gate) => ringGroupOf[gate.state] === group).length }))
    .filter((groupCount) => groupCount.gateCount > 0)
    .reduce<GateRingSegment[]>((segments, groupCount) => {
      const previousSegment = segments.at(-1)
      const startFraction = previousSegment ? previousSegment.startFraction + previousSegment.lengthFraction : 0
      return [...segments, { ...groupCount, startFraction, lengthFraction: groupCount.gateCount / gates.length }]
    }, [])

/**
 * Says which ring group a check state is drawn in.
 * @param state The check's state.
 * @returns The group.
 */
export const gateRingGroupOf = (state: GateState): GateRingGroup => ringGroupOf[state]
