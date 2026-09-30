import type { IngestTokenSummary, NetlifyStatus, RepositoryReference, SecretSummary, SessionState, VaultState } from '@agent-dashboard/contracts'
import { repositoryKey } from '@/lib/presentation'
import type { DashboardApi, DemoPullRequestOutcome } from '@/lib/types'
import { sampleIngestTokens, sampleSessionsOverview, sampleUsageReport } from './sample-activity'
import { applyDemoPullRequestOutcomes, demoMediaUrls, sampleBoardColumns } from './sample-board'
import { demoUser, sampleRepositories, sampleSecrets } from './sample-data'

const demoNetlifySite = (repository: RepositoryReference): NetlifyStatus => {
  const siteName = `${repository.owner}-${repository.name}`
  return { state: 'active', siteName, siteUrl: `https://${siteName}.netlify.app`, adminUrl: `https://app.netlify.com/projects/${siteName}` }
}

/**
 * Creates the in-page API that demo mode uses in place of a server.
 * Demo mode has no server: everything below lives in this page and is gone on reload, so a
 * value typed into the credentials dialog never leaves the browser.
 * @returns The demo API, holding its state in memory only.
 */
export const createDemoApi = (): DashboardApi => {
  const demoVaultState: VaultState = { mode: 'environment', initialised: true, unlocked: true }
  const demoSessionState: SessionState = { signInRequired: false, signInAvailable: false, user: demoUser }
  const demoMemory: {
    secrets: SecretSummary[]
    ingestTokens: IngestTokenSummary[]
    pullRequestOutcomes: Map<number, DemoPullRequestOutcome>
    netlifyRepositoryKeys: Set<string>
  } = {
    secrets: sampleSecrets.map((secret) => ({ ...secret })),
    ingestTokens: sampleIngestTokens.map((ingestToken) => ({ ...ingestToken })),
    pullRequestOutcomes: new Map(),
    netlifyRepositoryKeys: new Set(['cnotv/example']),
  }

  const replaceSecret = (name: string, update: Partial<SecretSummary>): void => {
    demoMemory.secrets = demoMemory.secrets.map((secret) => (secret.name === name ? { ...secret, ...update } : secret))
  }

  return {
    signInUrl: '#',
    readSession: async () => demoSessionState,
    signOut: async () => undefined,
    readVault: async () => demoVaultState,
    setUpVault: async () => demoVaultState,
    unlockVault: async () => demoVaultState,
    lockVault: async () => demoVaultState,
    listSecrets: async () => demoMemory.secrets,
    saveSecret: async (name, value) =>
      replaceSecret(name, { isSet: true, lastFour: value.trim().slice(-4), updatedAt: new Date().toISOString() }),
    deleteSecret: async (name) => replaceSecret(name, { isSet: false, lastFour: null, updatedAt: null }),
    testSecret: async () => ({ ok: true, status: null, message: 'Demo mode: nothing was sent' }),
    listRepositories: async () => sampleRepositories,
    readBoard: async (repository) => ({
      repository,
      columns: applyDemoPullRequestOutcomes(sampleBoardColumns, demoMemory.pullRequestOutcomes),
      fetchedAt: new Date().toISOString(),
    }),
    mergePullRequest: async (_repository, pullRequest) => {
      demoMemory.pullRequestOutcomes = new Map([...demoMemory.pullRequestOutcomes, [pullRequest.number, 'merged']])
    },
    closePullRequest: async (_repository, pullRequest) => {
      demoMemory.pullRequestOutcomes = new Map([...demoMemory.pullRequestOutcomes, [pullRequest.number, 'closed']])
    },
    readNetlifyStatus: async (repository) =>
      demoMemory.netlifyRepositoryKeys.has(repositoryKey(repository)) ? demoNetlifySite(repository) : { state: 'inactive' },
    enableNetlify: async (repository) => {
      demoMemory.netlifyRepositoryKeys = new Set([...demoMemory.netlifyRepositoryKeys, repositoryKey(repository)])
      return demoNetlifySite(repository)
    },
    readSessions: async (hours) => sampleSessionsOverview(hours, Date.now()),
    readUsage: async (days) => sampleUsageReport(days, Date.now()),
    listIngestTokens: async () => demoMemory.ingestTokens,
    createIngestToken: async (label) => {
      const summary = { tokenId: `demo-${demoMemory.ingestTokens.length + 1}`, label, createdAt: new Date().toISOString(), lastUsedAt: null }
      demoMemory.ingestTokens = [...demoMemory.ingestTokens, summary]
      return { summary, token: 'adt_demo-only-this-token-does-not-work-anywhere' }
    },
    revokeIngestToken: async (tokenId) => {
      demoMemory.ingestTokens = demoMemory.ingestTokens.filter((ingestToken) => ingestToken.tokenId !== tokenId)
    },
    pullRequestMediaUrl: (_repository, _pullRequest, kind) => demoMediaUrls[kind],
  }
}
