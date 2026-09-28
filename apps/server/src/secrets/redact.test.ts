import { describe, expect, it } from 'vitest'
import { createRedactor } from './redact.ts'

describe('createRedactor', () => {
  it('replaces every occurrence of a secret value', () => {
    const redact = createRedactor(['sk-or-v1-abcdef123456'])
    expect(redact('key sk-or-v1-abcdef123456 and again sk-or-v1-abcdef123456')).toBe('key [redacted] and again [redacted]')
  })

  it('handles values containing pattern characters', () => {
    expect(createRedactor(['a+b*c?d(e)f'])('x a+b*c?d(e)f y')).toBe('x [redacted] y')
  })

  it('ignores values too short to be credentials', () => {
    expect(createRedactor(['abc'])('abc stays')).toBe('abc stays')
  })

  it('returns text unchanged when there is nothing to redact', () => {
    expect(createRedactor([])('plain text')).toBe('plain text')
  })
})
