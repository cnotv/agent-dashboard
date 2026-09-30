import type { RepositoryReference } from '@agent-dashboard/contracts'
import type { ActivityDependencies } from '../activity/types.ts'
import type { AuthDependencies, DashboardSession } from '../auth/types.ts'
import type { GithubRestFetcher, GithubRestRequest, GraphqlFetcher } from '../github/types.ts'
import type { NetlifyFetcher } from '../netlify/types.ts'
import type { SessionStartServices } from '../session-starts/types.ts'
import type { SecretDefinitionWithTester, SecretTestRunner, Vault } from '../secrets/types.ts'

export interface AppDependencies {
  vault: Vault
  auth: AuthDependencies
  activity: ActivityDependencies
  sessionStarts: SessionStartServices
  repositories: RepositoryReference[]
  secretDefinitions: SecretDefinitionWithTester[]
  testSecret: SecretTestRunner
  createGraphqlFetcher: (token: string) => GraphqlFetcher
  createGithubRestFetcher: (token: string) => GithubRestFetcher
  createNetlifyFetcher: (token: string) => NetlifyFetcher
  mediaCacheDirectory: string
  allowedHostNames: string[]
  boardCacheMilliseconds: number
  now: () => number
}

export interface AppEnvironment {
  Variables: { session: DashboardSession | null }
}

export interface ReceivedRestRequest extends GithubRestRequest {
  path: string
}
