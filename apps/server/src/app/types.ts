import type { RepositoryReference } from '@agent-dashboard/contracts'
import type { AuthDependencies, DashboardSession } from '../auth/types.ts'
import type { GraphqlFetcher } from '../github/types.ts'
import type { SecretDefinitionWithTester, SecretTestRunner, Vault } from '../secrets/types.ts'

export interface AppDependencies {
  vault: Vault
  auth: AuthDependencies
  repositories: RepositoryReference[]
  secretDefinitions: SecretDefinitionWithTester[]
  testSecret: SecretTestRunner
  createGraphqlFetcher: (token: string) => GraphqlFetcher
  allowedHostNames: string[]
  boardCacheMilliseconds: number
  now: () => number
}

export interface AppEnvironment {
  Variables: { session: DashboardSession | null }
}
