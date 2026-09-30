import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createTestApp, getRequest, jsonRequest, signedVideoUrl, testHost } from './test-app.ts'

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

  it('sends security headers, without HSTS over plain http', async () => {
    const { app } = createTestApp()
    const response = await app.request(getRequest('/api/health'))
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('strict-transport-security')).toBeNull()
  })

  it('sends HSTS behind https', async () => {
    const { app } = createTestApp({}, { secureCookies: true })
    const response = await app.request(getRequest('/api/health'))
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000')
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
    // One GraphQL call for the board and one REST call for its recordings, both with the token.
    expect(receivedTokens).toEqual([sampleToken, sampleToken])
    await app.request(getRequest('/api/repositories/cnotv/generative-art/board?refresh=1'))
    expect(receivedTokens).toHaveLength(4)
  })

  it('refuses a repository that is not configured', async () => {
    const { app } = createTestApp()
    expect((await app.request(getRequest('/api/repositories/someone/else/board'))).status).toBe(404)
  })
})

describe('pull request media route', () => {
  const mediaPath = (kind: string) => `/api/repositories/cnotv/generative-art/pulls/7/media/${kind}`

  it('sends the browser to the signed GitHub link, and reuses the rendered body for a while', async () => {
    const { app, vault, receivedTokens } = createTestApp()
    vault.saveSecret('github-token', sampleToken)
    const response = await app.request(getRequest(mediaPath('video')))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(signedVideoUrl)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await app.request(getRequest(mediaPath('video')))
    expect(receivedTokens).toHaveLength(1)
  })

  it('answers 404 for a kind the body does not have, or one that does not exist', async () => {
    const { app, vault } = createTestApp()
    vault.saveSecret('github-token', sampleToken)
    expect((await app.request(getRequest(mediaPath('image')))).status).toBe(404)
    expect((await app.request(getRequest(mediaPath('audio')))).status).toBe(404)
    expect((await app.request(getRequest('/api/repositories/cnotv/generative-art/pulls/abc/media/video'))).status).toBe(404)
  })

  it('asks for a GitHub token first', async () => {
    const { app } = createTestApp()
    expect((await app.request(getRequest(mediaPath('video')))).status).toBe(412)
  })
})

describe('pull request recordings', () => {
  const artifactListPath = '/repos/cnotv/generative-art/actions/artifacts?name=pr-preview&per_page=100'
  const recordedScreenshot = new Uint8Array([137, 80, 78, 71, 1, 2, 3])
  const recordedVideo = new Uint8Array([26, 69, 223, 163, 4, 5, 6])
  const artifactList = {
    artifacts: [
      { id: 11, name: 'pr-preview', expired: false, created_at: '2026-09-01T00:00:00Z', workflow_run: { head_sha: 'fedc9876' } },
      { id: 12, name: 'pr-preview', expired: false, created_at: '2026-09-02T00:00:00Z', workflow_run: { head_sha: 'fedc9876' } },
      { id: 13, name: 'lighthouse-results', expired: false, created_at: '2026-09-02T00:00:00Z', workflow_run: { head_sha: 'fedc9876' } },
    ],
  }
  const recordingResponses = () => ({
    [artifactListPath]: Response.json(artifactList),
    '/repos/cnotv/generative-art/actions/artifacts/12/zip': new Response(
      zipSync({ 'screenshot.png': recordedScreenshot, 'video.webm': recordedVideo }),
    ),
  })

  it('marks a pull request with a recording as having both media', async () => {
    const { app, vault } = createTestApp({}, {}, { now: 0 }, recordingResponses())
    vault.saveSecret('github-token', sampleToken)
    const board: unknown = await (await app.request(getRequest('/api/repositories/cnotv/generative-art/board'))).json()
    expect(JSON.stringify(board)).toContain('"headSha":"fedc9876"')
    expect(board).toEqual(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            status: 'draft',
            cards: [expect.objectContaining({ pullRequest: expect.objectContaining({ media: { hasImage: true, hasVideo: true } }) })],
          }),
        ]),
      }),
    )
  })

  it('serves the newest recording of the head commit from this origin, downloading it once', async () => {
    const { app, vault, receivedRestPaths } = createTestApp({}, {}, { now: 0 }, recordingResponses())
    vault.saveSecret('github-token', sampleToken)
    const videoResponse = await app.request(getRequest('/api/repositories/cnotv/generative-art/pulls/31/media/video?sha=fedc9876'))
    expect(videoResponse.status).toBe(200)
    expect(videoResponse.headers.get('content-type')).toBe('video/webm')
    expect(videoResponse.headers.get('content-security-policy')).toContain('sandbox')
    expect(new Uint8Array(await videoResponse.arrayBuffer())).toEqual(recordedVideo)
    const imageResponse = await app.request(getRequest('/api/repositories/cnotv/generative-art/pulls/31/media/image?sha=fedc9876'))
    expect(new Uint8Array(await imageResponse.arrayBuffer())).toEqual(recordedScreenshot)
    expect(receivedRestPaths.filter((path) => path.endsWith('/zip'))).toEqual(['/repos/cnotv/generative-art/actions/artifacts/12/zip'])
  })

  it('falls back to the body when the commit has no recording', async () => {
    const { app, vault } = createTestApp({}, {}, { now: 0 }, recordingResponses())
    vault.saveSecret('github-token', sampleToken)
    const response = await app.request(getRequest('/api/repositories/cnotv/generative-art/pulls/7/media/video?sha=0123abcd'))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(signedVideoUrl)
  })
})
