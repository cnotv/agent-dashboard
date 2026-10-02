import { describe, expect, it } from 'vitest'
import { returnPathFrom } from './return-after-sign-in'

describe('returnPathFrom', () => {
  it('returns to a page on this dashboard with its query', () => {
    expect(returnPathFrom('/pair?code=ABCD-2345')).toBe('/pair?code=ABCD-2345')
  })

  it('never leaves the dashboard', () => {
    expect(returnPathFrom('https://example.com')).toBeNull()
    expect(returnPathFrom('//example.com/pair')).toBeNull()
    expect(returnPathFrom('/\\example.com')).toBeNull()
    expect(returnPathFrom(null)).toBeNull()
  })
})
