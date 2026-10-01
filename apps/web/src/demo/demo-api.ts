import type {
  ChatMessage,
  MachineTokenKind,
  MachineTokenSummary,
  NetlifyStatus,
  RepositoryReference,
  SecretSummary,
  SessionStart,
  SessionState,
  VaultState,
} from '@agent-dashboard/contracts'
import { repositoryKey } from '@/lib/presentation'
import { chatKeyOf } from '@/lib/session-chat'
import type { DashboardApi, DemoPullRequestOutcome } from '@/lib/types'
import {
  sampleChatMessages,
  sampleIngestTokens,
  sampleRunnerTokens,
  sampleSessionStarts,
  sampleSessionsOverview,
  sampleUsageReport,
} from './sample-activity'
import { applyDemoPullRequestOutcomes, demoMediaUrls, sampleBoardColumns, samplePullRequestFiles } from './sample-board'
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
    machineTokens: Record<MachineTokenKind, MachineTokenSummary[]>
    sessionStarts: SessionStart[]
    routineRepositoryKeys: Set<string>
    pullRequestOutcomes: Map<number, DemoPullRequestOutcome>
    netlifyRepositoryKeys: Set<string>
    chatMessages: Map<string, ChatMessage[]>
  } = {
    secrets: sampleSecrets.map((secret) => ({ ...secret })),
    machineTokens: { ingest: sampleIngestTokens.map((token) => ({ ...token })), runner: sampleRunnerTokens.map((token) => ({ ...token })) },
    sessionStarts: sampleSessionStarts.map((start) => ({ ...start })),
    routineRepositoryKeys: new Set(['cnotv/example']),
    pullRequestOutcomes: new Map(),
    netlifyRepositoryKeys: new Set(['cnotv/example']),
    chatMessages: new Map(),
  }
  const chatMessagesOf = (chatKey: string): ChatMessage[] => demoMemory.chatMessages.get(chatKey) ?? sampleChatMessages

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
    readPullRequestFiles: async () => samplePullRequestFiles,
    readNetlifyStatus: async (repository) =>
      demoMemory.netlifyRepositoryKeys.has(repositoryKey(repository)) ? demoNetlifySite(repository) : { state: 'inactive' },
    enableNetlify: async (repository) => {
      demoMemory.netlifyRepositoryKeys = new Set([...demoMemory.netlifyRepositoryKeys, repositoryKey(repository)])
      return demoNetlifySite(repository)
    },
    readSessions: async (hours) => sampleSessionsOverview(hours, Date.now()),
    readSessionChat: async (target) => ({
      sessionId: chatKeyOf(target),
      availability: 'on-laptop',
      deliveryRoute: 'tmux',
      sendBlocker: null,
      messages: chatMessagesOf(chatKeyOf(target)),
      deliveries: [],
      updatedAt: new Date().toISOString(),
    }),
    sendChatMessage: async (target, text) => {
      const createdAt = new Date().toISOString()
      const typedMessage: ChatMessage = { messageId: `demo-typed-${createdAt}`, role: 'user', kind: 'text', text, toolName: null, createdAt }
      const reply: ChatMessage = {
        messageId: `demo-reply-${createdAt}`,
        role: 'assistant',
        kind: 'text',
        text: 'Demo mode: this reply is canned, and your message went to no session.',
        toolName: null,
        createdAt,
      }
      const chatKey = chatKeyOf(target)
      demoMemory.chatMessages = new Map([...demoMemory.chatMessages, [chatKey, [...chatMessagesOf(chatKey), typedMessage, reply]]])
      return { deliveryId: `demo-${createdAt}`, text, state: 'delivered', message: null, createdAt }
    },
    readUsage: async (days) => sampleUsageReport(days, Date.now()),
    listMachineTokens: async (kind) => demoMemory.machineTokens[kind],
    createMachineToken: async (kind, label) => {
      const summary = { tokenId: `demo-${kind}-${demoMemory.machineTokens[kind].length + 1}`, label, createdAt: new Date().toISOString(), lastUsedAt: null }
      demoMemory.machineTokens = { ...demoMemory.machineTokens, [kind]: [...demoMemory.machineTokens[kind], summary] }
      return { summary, token: `${kind === 'ingest' ? 'adt' : 'adr'}_demo-only-this-token-does-not-work-anywhere` }
    },
    revokeMachineToken: async (kind, tokenId) => {
      demoMemory.machineTokens = { ...demoMemory.machineTokens, [kind]: demoMemory.machineTokens[kind].filter((token) => token.tokenId !== tokenId) }
    },
    readStartOptions: async (repository) => ({
      runners: [{ label: 'Mac mini', lastSeenAt: new Date().toISOString(), isOnline: true }],
      routineConfigured: demoMemory.routineRepositoryKeys.has(repositoryKey(repository)),
    }),
    listSessionStarts: async () => demoMemory.sessionStarts,
    startSession: async (request) => {
      const now = new Date().toISOString()
      const start: SessionStart = {
        ...request,
        startId: `demo-start-${demoMemory.sessionStarts.length + 1}`,
        state: 'started',
        runnerLabel: request.target === 'cloud-routine' ? null : 'Mac mini',
        sessionUrl: null,
        message: 'Demo mode: nothing was started',
        createdAt: now,
        updatedAt: now,
      }
      demoMemory.sessionStarts = [start, ...demoMemory.sessionStarts]
      return start
    },
    readRoutineSettings: async (repository) => {
      const configured = demoMemory.routineRepositoryKeys.has(repositoryKey(repository))
      return { configured, routineId: configured ? 'trig_01DemoRoutine' : null }
    },
    saveRoutineSettings: async (repository) => {
      demoMemory.routineRepositoryKeys = new Set([...demoMemory.routineRepositoryKeys, repositoryKey(repository)])
    },
    deleteRoutineSettings: async (repository) => {
      demoMemory.routineRepositoryKeys = new Set([...demoMemory.routineRepositoryKeys].filter((key) => key !== repositoryKey(repository)))
    },
    pullRequestMediaUrl: (_repository, _pullRequest, kind) => demoMediaUrls[kind],
  }
}
