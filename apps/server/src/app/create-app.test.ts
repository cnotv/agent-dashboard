import { describe, expect, it } from 'vitest'
import { createTestApp, getRequest, jsonRequest, testHost } from './test-app.ts'

const sampleToken = 'ghp_exampleTokenValue1234567890abcd'
const host = testHost

describe('secrets routes', () => {
  it('stores a secret and never returns its value from any route', async () => {
    const { app } = createTestApp()
    const saveResponse = await app.request(jsonRequest('PUT', '/api/secrets/github-token', { value: sampleToken }))
    expect(saveResponse.status).toBe(204)

    const responseBodies = await Promise.all(
      ['/api/secrets', '/api/vault', '/api/repositories', '/api/repositories/cnotv/generative-art/board'].map(async (path) =>
        (await app.request(getRequest(path))).text(),
      ),
    )
    const testBody = await (await app.request(jsonRequest('POST', '/api/secrets/github-token/test', {}))).text()
    ;[...responseBodies, testBody].forEach((responseBody) => expect(responseBody).not.toContain(sampleToken))
    expect(JSON.parse(responseBodies[0] ?? '[]')).toContainEqual(
      expect.objectContaining({ name: 'github-token', isSet: true, lastFour: 'abcd' }),
    )
  })

  it('refuses unknown secret names', async () => {
    const { app } = createTestApp()
    expect((await app.request(jsonRequest('PUT', '/api/secrets/anything', { value: 'x' }))).status).toBe(404)
  })

  it('redacts a secret value that appears in an error message', async () => {
    const { app, vault } = createTestApp({
      createGraphqlFetcher: (token) => async () => {
        throw new Error(`request failed for ${token}`)
      },
    })
    vault.saveSecret('github-token', sampleToken)
    const errorBody = await (await app.request(getRequest('/api/repositories/cnotv/generative-art/board'))).text()
    expect(errorBody).toContain('[redacted]')
    expect(errorBody).not.toContain(sampleToken)
  })
})

describe('request guards', () => {
  it('rejects an unknown host header', async () => {
    const { app } = createTestApp()
    const response = await app.request(new Request('http://attacker.example/api/vault', { headers: { host: 'attacker.example' } }))
    expect(response.status).toBe(403)
  })

  it('rejects a cross-origin mutation', async () => {
    const { app } = createTestApp()
    const response = await app.request(
      jsonRequest('PUT', '/api/secrets/github-token', { value: sampleToken }, { origin: 'https://attacker.example' }),
    )
    expect(response.status).toBe(403)
  })

  it('rejects a mutation that is not JSON', async () => {
    const { app } = createTestApp()
    const response = await app.request(
      new Request(`http://${host}/api/vault/lock`, { method: 'POST', headers: { host, 'content-type': 'text/plain' }, body: 'x' }),
    )
    expect(response.status).toBe(415)
  })
})

describe('board route', () => {
  it('asks for a GitHub token first', async () => {
    const { app } = createTestApp()
    expect((await app.request(getRequest('/api/repositories/cnotv/generative-art/board'))).status).toBe(412)
  })

  it('returns the board using the stored token and caches it', async () => {
    const { app, vault, receivedTokens } = createTestApp()
    vault.saveSecret('github-token', sampleToken)
    const firstResponse = await app.request(getRequest('/api/repositories/cnotv/generative-art/board'))
    await app.request(getRequest('/api/repositories/cnotv/generative-art/board'))
    expect(firstResponse.status).toBe(200)
    expect(receivedTokens).toEqual([sampleToken])
    await app.request(getRequest('/api/repositories/cnotv/generative-art/board?refresh=1'))
    expect(receivedTokens).toHaveLength(2)
  })

  it('refuses a repository that is not configured', async () => {
    const { app } = createTestApp()
    expect((await app.request(getRequest('/api/repositories/someone/else/board'))).status).toBe(404)
  })
})
