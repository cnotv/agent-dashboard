import { z } from 'zod'
import { codeChallengeFor } from './pkce.ts'
import type { GitHubAuthClient, GitHubSignInSettings } from './types.ts'

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize'
const githubTokenUrl = 'https://github.com/login/oauth/access_token'
const githubUserUrl = 'https://api.github.com/user'

const tokenResponseSchema = z.union([
  z.object({ access_token: z.string().min(1), expires_in: z.number().optional() }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
])

const userResponseSchema = z.object({ login: z.string().min(1), avatar_url: z.string() })

export const buildAuthorizeUrl = (settings: GitHubSignInSettings, state: string, codeVerifier: string): string => {
  const authorizeUrl = new URL(githubAuthorizeUrl)
  authorizeUrl.search = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.callbackUrl,
    state,
    code_challenge: codeChallengeFor(codeVerifier),
    code_challenge_method: 'S256',
  }).toString()
  return authorizeUrl.toString()
}

export const isAllowedLogin = (login: string, allowedLogins: string[]): boolean =>
  allowedLogins.some((allowedLogin) => allowedLogin.toLowerCase() === login.toLowerCase())

export const createGitHubAuthClient = (settings: GitHubSignInSettings, fetchResource: typeof fetch = fetch): GitHubAuthClient => ({
  exchangeCode: async (code, codeVerifier) => {
    const tokenResponse = await fetchResource(githubTokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'agent-dashboard' },
      body: JSON.stringify({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        code,
        redirect_uri: settings.callbackUrl,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!tokenResponse.ok) throw new Error(`GitHub answered ${tokenResponse.status} to the sign-in`)
    const parsedToken = tokenResponseSchema.parse(await tokenResponse.json())
    if ('error' in parsedToken) throw new Error(`GitHub refused the sign-in: ${parsedToken.error_description ?? parsedToken.error}`)
    return { accessToken: parsedToken.access_token, expiresInSeconds: parsedToken.expires_in ?? null }
  },
  readUser: async (accessToken) => {
    const userResponse = await fetchResource(githubUserUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'agent-dashboard' },
      signal: AbortSignal.timeout(15000),
    })
    if (!userResponse.ok) throw new Error(`GitHub answered ${userResponse.status} when reading the signed-in user`)
    const { login, avatar_url } = userResponseSchema.parse(await userResponse.json())
    return { login, avatarUrl: avatar_url }
  },
})
