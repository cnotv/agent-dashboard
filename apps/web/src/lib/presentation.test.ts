import { describe, expect, it } from 'vitest'
import { parseRepositoryKey, repositoryKey } from './presentation'

describe('repository keys', () => {
  it('round-trips an owner and name', () => {
    expect(parseRepositoryKey(repositoryKey({ owner: 'cnotv', name: 'generative-art' }))).toEqual({
      owner: 'cnotv',
      name: 'generative-art',
    })
  })

  it('rejects malformed keys', () => {
    expect(parseRepositoryKey('cnotv')).toBeNull()
    expect(parseRepositoryKey('a/b/c')).toBeNull()
    expect(parseRepositoryKey('/b')).toBeNull()
  })
})
