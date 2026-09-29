import { describe, expect, it } from 'vitest'
import { createTestApp, getRequest, jsonRequest } from '../app/test-app.ts'
import { codeChallengeFor } from './pkce.ts'
import { createSessionStore } from './session-store.ts'
import type { GitHubAuthClient, GitHubSignIn } from './types.ts'

const userToken = 'ghu_exampleUserToken1234567890abcd'
const settings = {
  clientId: 'Iv23example',
  clientSecret: 'client-secret-value-123456',
  callbackUrl: 'http://localhost:4317/api/auth/github/callback',
  allowedLogins: ['cnotv'],
}

const createFakeClient = (login: string, receivedVerifiers: string[] = []): GitHubAuthClient => ({
  exchangeCode: async (code, codeVerifier) => {
    receivedVerifiers.push(codeVerifier)
    if (code !== 'good-code') throw new Error('bad code')
    return { accessToken: userToken, expiresInSeconds: 28800 }
  },
  readUser: async () => ({ login, avatarUrl: `https://avatars.example/${login}` }),
})

const createSignInApp = (login = 'cnotv', signInRequired = true) => {
  const receivedVerifiers: string[] = []
  const githubSignIn: GitHubSignIn = { settings, client: createFakeClient(login, receivedVerifiers) }
  const testApp = createTestApp({}, { githubSignIn, signInRequired, sessionStore: createSessionStore(() => 0) })
  return { ...testApp, receivedVerifiers }
}

const readSetCookies = (response: Response): Map<string, string> =>
  new Map(
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0] ?? '')
      .map((pair): [string, string] => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]),
  )

const cookieHeader = (cookies: Map<string, string>): string =>
  [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')

const startSignIn = async (app: ReturnType<typeof createSignInApp>['app']) => {
  const startResponse = await app.request(getRequest('/api/auth/github/start'))
  const authorizeUrl = new URL(startResponse.headers.get('location') ?? '')
  return { startResponse, authorizeUrl, cookies: readSetCookies(startResponse) }
}

const signIn = async (app: ReturnType<typeof createSignInApp>['app']) => {
  const { authorizeUrl, cookies } = await startSignIn(app)
  const state = authorizeUrl.searchParams.get('state') ?? ''
  const callbackResponse = await app.request(
    getRequest(`/api/auth/github/callback?code=good-code&state=${state}`, { cookie: cookieHeader(cookies) }),
  )
  return { callbackResponse, sessionCookies: readSetCookies(callbackResponse) }
}

describe('sign-in required', () => {
  it('answers 401 on every private route without a session', async () => {
    const { app } = createSignInApp()
    const statuses = await Promise.all(
      ['/api/vault', '/api/secrets', '/api/repositories', '/api/repositories/cnotv/generative-art/board'].map(
        async (path) => (await app.request(getRequest(path))).status,
      ),
    )
    expect(statuses).toEqual([401, 401, 401, 401])
    expect((await app.request(jsonRequest('PUT', '/api/secrets/github-token', { value: 'x' }))).status).toBe(401)
  })

  it('keeps health and the session state public', async () => {
    const { app } = createSignInApp()
    expect((await app.request(getRequest('/api/health'))).status).toBe(200)
    const sessionState = await (await app.request(getRequest('/api/auth/session'))).json()
    expect(sessionState).toEqual({ signInRequired: true, signInAvailable: true, user: null })
  })
})

describe('GitHub sign-in flow', () => {
  it('sends the browser to GitHub with state and a PKCE challenge', async () => {
    const { app } = createSignInApp()
    const { startResponse, authorizeUrl, cookies } = await startSignIn(app)
    expect(startResponse.status).toBe(302)
    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(authorizeUrl.searchParams.get('client_id')).toBe(settings.clientId)
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(settings.callbackUrl)
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(cookies.get('agent_dashboard_sign_in')).toBe(authorizeUrl.searchParams.get('state'))
  })

  it('signs an allowed user in and uses their token for the board', async () => {
    const { app, receivedTokens } = createSignInApp()
    const { callbackResponse, sessionCookies } = await signIn(app)
    expect(callbackResponse.headers.get('location')).toBe('/')

    const cookie = cookieHeader(sessionCookies)
    const sessionState = await (await app.request(getRequest('/api/auth/session', { cookie }))).json()
    expect(sessionState).toEqual(expect.objectContaining({ user: { login: 'cnotv', avatarUrl: 'https://avatars.example/cnotv' } }))
    expect(JSON.stringify(sessionState)).not.toContain(userToken)

    const boardResponse = await app.request(getRequest('/api/repositories/cnotv/generative-art/board', { cookie }))
    expect(boardResponse.status).toBe(200)
    expect(receivedTokens).toEqual([userToken])
  })

  it('sends the verifier that matches the challenge it advertised', async () => {
    const { app, receivedVerifiers } = createSignInApp()
    const { authorizeUrl, cookies } = await startSignIn(app)
    const state = authorizeUrl.searchParams.get('state') ?? ''
    await app.request(getRequest(`/api/auth/github/callback?code=good-code&state=${state}`, { cookie: cookieHeader(cookies) }))
    expect(codeChallengeFor(receivedVerifiers.at(-1) ?? '')).toBe(authorizeUrl.searchParams.get('code_challenge'))
  })

  it('refuses a callback whose state was not started in this browser', async () => {
    const { app } = createSignInApp()
    const { authorizeUrl } = await startSignIn(app)
    const state = authorizeUrl.searchParams.get('state') ?? ''
    const callbackResponse = await app.request(getRequest(`/api/auth/github/callback?code=good-code&state=${state}`))
    expect(callbackResponse.headers.get('location')).toBe('/?sign-in-error=expired')
    expect(readSetCookies(callbackResponse).get('agent_dashboard_session')).toBeFalsy()
  })

  it('does not reuse a state twice', async () => {
    const { app } = createSignInApp()
    const { authorizeUrl, cookies } = await startSignIn(app)
    const callbackPath = `/api/auth/github/callback?code=good-code&state=${authorizeUrl.searchParams.get('state')}`
    await app.request(getRequest(callbackPath, { cookie: cookieHeader(cookies) }))
    const replayResponse = await app.request(getRequest(callbackPath, { cookie: cookieHeader(cookies) }))
    expect(replayResponse.headers.get('location')).toBe('/?sign-in-error=expired')
  })

  it('reports a cancelled sign-in as failed', async () => {
    const { app } = createSignInApp()
    const { authorizeUrl, cookies } = await startSignIn(app)
    const state = authorizeUrl.searchParams.get('state') ?? ''
    const callbackResponse = await app.request(
      getRequest(`/api/auth/github/callback?error=access_denied&state=${state}`, { cookie: cookieHeader(cookies) }),
    )
    expect(callbackResponse.headers.get('location')).toBe('/?sign-in-error=failed')
  })

  it('turns away a GitHub account that is not on the allowlist', async () => {
    const { app } = createSignInApp('someone-else')
    const { callbackResponse, sessionCookies } = await signIn(app)
    expect(callbackResponse.headers.get('location')).toBe('/?sign-in-error=not-allowed')
    expect(sessionCookies.get('agent_dashboard_session')).toBeFalsy()
  })

  it('signs out', async () => {
    const { app } = createSignInApp()
    const { sessionCookies } = await signIn(app)
    const cookie = cookieHeader(sessionCookies)
    expect((await app.request(jsonRequest('POST', '/api/auth/sign-out', {}, { cookie }))).status).toBe(204)
    expect((await app.request(getRequest('/api/vault', { cookie }))).status).toBe(401)
  })

  it('never writes the GitHub token to the database', async () => {
    const { app, database } = createSignInApp()
    await signIn(app)
    const storedRows = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
    const everyValue = storedRows.flatMap((tableRow) =>
      database.prepare(`SELECT * FROM "${String(tableRow.name)}"`).all().map((row) => JSON.stringify(row)),
    )
    everyValue.forEach((value) => expect(value).not.toContain(userToken))
  })
})

describe('secure cookies', () => {
  it('uses the __Host- prefix behind https', async () => {
    const githubSignIn: GitHubSignIn = { settings, client: createFakeClient('cnotv') }
    const { app } = createTestApp({}, { githubSignIn, signInRequired: true, secureCookies: true })
    const startResponse = await app.request(getRequest('/api/auth/github/start'))
    const stateCookie = startResponse.headers.getSetCookie()[0] ?? ''
    expect(stateCookie).toMatch(/^__Host-agent_dashboard_sign_in=/)
    expect(stateCookie).toContain('Secure')
    expect(stateCookie).toContain('HttpOnly')
    expect(stateCookie).toContain('SameSite=Lax')
  })
})

describe('session store limits', () => {
  it('keeps at most a thousand pending sign-ins, dropping the oldest', () => {
    const sessionStore = createSessionStore(() => 0)
    const [firstState, ...laterStates] = Array.from({ length: 1001 }, (_, index) => sessionStore.createPendingSignIn(`verifier-${index}`))
    expect(sessionStore.takePendingSignIn(firstState)).toBeNull()
    expect(sessionStore.takePendingSignIn(laterStates.at(-1))).toEqual(expect.objectContaining({ codeVerifier: 'verifier-1000' }))
  })
})

describe('session expiry', () => {
  it('forgets a session once its token has expired', async () => {
    const clock = { now: 0 }
    const sessionStore = createSessionStore(() => clock.now)
    const sessionId = sessionStore.createSession({ login: 'cnotv', avatarUrl: '' }, userToken, 1000)
    expect(sessionStore.readSession(sessionId)).not.toBeNull()
    clock.now = 1000
    expect(sessionStore.readSession(sessionId)).toBeNull()
  })
})
