import type { SignedInUser } from '@agent-dashboard/contracts'

export interface GitHubSignInSettings {
  clientId: string
  clientSecret: string
  callbackUrl: string
  allowedLogins: string[]
}

export interface DashboardSession {
  user: SignedInUser
  githubToken: string
  expiresAt: number
}

export interface PendingSignIn {
  codeVerifier: string
  expiresAt: number
}

export interface SessionStore {
  createSession: (user: SignedInUser, githubToken: string, expiresAt: number) => string
  readSession: (sessionId: string | undefined) => DashboardSession | null
  removeSession: (sessionId: string | undefined) => void
  createPendingSignIn: (codeVerifier: string) => string
  takePendingSignIn: (state: string | undefined) => PendingSignIn | null
}

export interface GitHubUserToken {
  accessToken: string
  expiresInSeconds: number | null
}

export interface GitHubAuthClient {
  exchangeCode: (code: string, codeVerifier: string) => Promise<GitHubUserToken>
  readUser: (accessToken: string) => Promise<SignedInUser>
}

export interface GitHubSignIn {
  settings: GitHubSignInSettings
  client: GitHubAuthClient
}

export interface AuthDependencies {
  sessionStore: SessionStore
  githubSignIn: GitHubSignIn | null
  signInRequired: boolean
  secureCookies: boolean
  now: () => number
}

export interface AuthCookieNames {
  session: string
  pendingSignIn: string
}

export type SignInFailure = 'expired' | 'not-allowed' | 'failed'
