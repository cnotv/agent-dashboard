import type {
  AgentSessionState,
  Board,
  CreatedIngestToken,
  IngestTokenSummary,
  MediaKind,
  PullRequestSummary,
  RepositoryReference,
  SecretSummary,
  SessionState,
  SecretTestResult,
  SessionsOverview,
  UsageReport,
  VaultState,
} from '@agent-dashboard/contracts'

export type RadixColor = 'gray' | 'blue' | 'indigo' | 'amber' | 'red' | 'green' | 'jade' | 'sky' | 'orange'

export type ToastTone = 'success' | 'error'

export interface ToastMessage {
  toastId: number
  text: string
  tone: ToastTone
}

export interface ToastApi {
  notifySuccess: (text: string) => void
  notifyError: (errorOrText: unknown) => void
}

export interface DashboardApi {
  signInUrl: string
  readSession: () => Promise<SessionState>
  signOut: () => Promise<void>
  readVault: () => Promise<VaultState>
  setUpVault: (passphrase: string) => Promise<VaultState>
  unlockVault: (passphrase: string) => Promise<VaultState>
  lockVault: () => Promise<VaultState>
  listSecrets: () => Promise<SecretSummary[]>
  saveSecret: (name: string, value: string) => Promise<void>
  deleteSecret: (name: string) => Promise<void>
  testSecret: (name: string) => Promise<SecretTestResult>
  listRepositories: () => Promise<RepositoryReference[]>
  readBoard: (repository: RepositoryReference, refresh: boolean) => Promise<Board>
  pullRequestMediaUrl: (repository: RepositoryReference, pullRequest: PullRequestSummary, kind: MediaKind) => string
  mergePullRequest: (repository: RepositoryReference, pullRequest: PullRequestSummary) => Promise<void>
  closePullRequest: (repository: RepositoryReference, pullRequest: PullRequestSummary) => Promise<void>
  readSessions: (hours: number) => Promise<SessionsOverview>
  readUsage: (days: number) => Promise<UsageReport>
  listIngestTokens: () => Promise<IngestTokenSummary[]>
  createIngestToken: (label: string) => Promise<CreatedIngestToken>
  revokeIngestToken: (tokenId: string) => Promise<void>
}

export type ChartedSessionState = Extract<AgentSessionState, 'working' | 'waiting' | 'idle'>

export interface TimelineBar {
  barKey: string
  state: ChartedSessionState
  startedAt: string
  endedAt: string
  leftPercent: number
  widthPercent: number
}

export interface TimelineLane {
  sessionId: string
  label: string
  detail: string
  state: AgentSessionState
  bars: TimelineBar[]
}

export interface TimeTick {
  tickKey: string
  label: string
  leftPercent: number
}

export interface SessionTimelineLayout {
  lanes: TimelineLane[]
  ticks: TimeTick[]
}

export interface ConnectSnippetInput {
  dashboardUrl: string
  ingestToken: string
}

export interface RuntimeConfiguration {
  isDemoMode: boolean
  apiBaseUrl: string
}

export type DemoPullRequestOutcome = 'merged' | 'closed'
