import type {
  AgentSessionState,
  Board,
  CreatedMachineToken,
  MachineTokenSummary,
  MediaKind,
  MachineTokenKind,
  NetlifyStatus,
  PullRequestSummary,
  RepositoryReference,
  RoutineSettings,
  SecretSummary,
  SessionState,
  SecretTestResult,
  SessionsOverview,
  SessionStart,
  SessionStartRequest,
  StartOptions,
  UsageReport,
  VaultState,
} from '@agent-dashboard/contracts'

export type RadixColor = 'gray' | 'blue' | 'indigo' | 'amber' | 'red' | 'green' | 'jade' | 'sky' | 'orange'

export type GateRingGroup = 'failure' | 'pending' | 'success' | 'other'

export interface GateRingSegment {
  group: GateRingGroup
  gateCount: number
  startFraction: number
  lengthFraction: number
}

export interface StartTargetAvailability {
  isAvailable: boolean
  hint: string | null
}

export interface RunnerSetupInput {
  dashboardUrl: string
  runnerToken: string
}

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
  readNetlifyStatus: (repository: RepositoryReference) => Promise<NetlifyStatus>
  enableNetlify: (repository: RepositoryReference) => Promise<NetlifyStatus>
  readSessions: (hours: number) => Promise<SessionsOverview>
  readUsage: (days: number) => Promise<UsageReport>
  listMachineTokens: (kind: MachineTokenKind) => Promise<MachineTokenSummary[]>
  createMachineToken: (kind: MachineTokenKind, label: string) => Promise<CreatedMachineToken>
  revokeMachineToken: (kind: MachineTokenKind, tokenId: string) => Promise<void>
  readStartOptions: (repository: RepositoryReference) => Promise<StartOptions>
  listSessionStarts: () => Promise<SessionStart[]>
  startSession: (request: SessionStartRequest) => Promise<SessionStart>
  readRoutineSettings: (repository: RepositoryReference) => Promise<RoutineSettings>
  saveRoutineSettings: (repository: RepositoryReference, routineId: string, token: string) => Promise<void>
  deleteRoutineSettings: (repository: RepositoryReference) => Promise<void>
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
