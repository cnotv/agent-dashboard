import { describe, expect, it } from 'vitest'
import type { CheckGate } from '@dashi/contracts'
import { gateRingSegments } from './gate-ring'

const gateIn = (state: CheckGate['state']): CheckGate => ({ name: state, state, url: null })

describe('gateRingSegments', () => {
  it('gives each state group an arc as long as its share, failures first', () => {
    const gates = [gateIn('success'), gateIn('success'), gateIn('failure'), gateIn('skipped')]
    expect(gateRingSegments(gates)).toEqual([
      { group: 'failure', gateCount: 1, startFraction: 0, lengthFraction: 0.25 },
      { group: 'success', gateCount: 2, startFraction: 0.25, lengthFraction: 0.5 },
      { group: 'other', gateCount: 1, startFraction: 0.75, lengthFraction: 0.25 },
    ])
  })

  it('draws one full arc when every check agrees, and nothing without checks', () => {
    expect(gateRingSegments([gateIn('pending'), gateIn('pending')])).toEqual([
      { group: 'pending', gateCount: 2, startFraction: 0, lengthFraction: 1 },
    ])
    expect(gateRingSegments([])).toEqual([])
  })
})
