import type { RepositoryReference } from '@agent-dashboard/contracts'
import type { GraphqlFetcher } from '../github/types.ts'
import type { SecretDefinitionWithTester, SecretTestRunner, Vault } from '../secrets/types.ts'

export interface AppDependencies {
  vault: Vault
  repositories: RepositoryReference[]
  secretDefinitions: SecretDefinitionWithTester[]
  testSecret: SecretTestRunner
  createGraphqlFetcher: (token: string) => GraphqlFetcher
  allowedHostNames: string[]
  boardCacheMilliseconds: number
  now: () => number
}
