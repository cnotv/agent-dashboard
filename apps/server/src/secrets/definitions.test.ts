import { describe, expect, it } from 'vitest'
import { secretDefinitions } from './definitions.ts'

describe('secretDefinitions', () => {
  it('links every credential to the https page where it is created', () => {
    secretDefinitions.forEach((definition) => expect(new URL(definition.tokenPageUrl).protocol).toBe('https:'))
  })
})
