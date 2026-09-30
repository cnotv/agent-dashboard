export interface RepositoryReference {
  owner: string
  name: string
}

export type GateState = 'success' | 'failure' | 'pending' | 'neutral' | 'skipped'

export interface CheckGate {
  name: string
  state: GateState
  url: string | null
}

export type GateOverallState = 'none' | 'passing' | 'running' | 'failing'

export interface GateSummary {
  passed: number
  failed: number
  pending: number
  total: number
  overallState: GateOverallState
}

export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export type Mergeable = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'

export type MediaKind = 'image' | 'video'

export interface PullRequestMedia {
  hasImage: boolean
  hasVideo: boolean
}

export interface PullRequestSummary {
  number: number
  title: string
  url: string
  isDraft: boolean
  headRefName: string
  headSha: string | null
  reviewDecision: ReviewDecision
  mergeable: Mergeable
  body: string
  updatedAt: string
  gates: CheckGate[]
  gateSummary: GateSummary
  media: PullRequestMedia
  previewUrl: string | null
}

export interface IssueLabel {
  name: string
  color: string
}

export interface IssueSummary {
  number: number
  title: string
  url: string
  updatedAt: string
  labels: IssueLabel[]
  linkedPullRequestNumbers: number[]
}

export type IssueStatus =
  | 'no-pull-request'
  | 'draft'
  | 'checks-running'
  | 'checks-failing'
  | 'ready-for-review'
  | 'approved'

export interface BoardCard {
  issues: IssueSummary[]
  pullRequest: PullRequestSummary | null
  status: IssueStatus
}

export interface BoardColumn {
  status: IssueStatus
  cards: BoardCard[]
}

export interface Board {
  repository: RepositoryReference
  columns: BoardColumn[]
  fetchedAt: string
}

export type NetlifyStatus =
  | { state: 'active'; siteName: string; siteUrl: string; adminUrl: string }
  | { state: 'inactive' }
  | { state: 'missing-token' }

export type VaultMode = 'environment' | 'passphrase'

export interface VaultState {
  mode: VaultMode
  initialised: boolean
  unlocked: boolean
}

export interface SecretDefinition {
  name: string
  label: string
  description: string
  tokenPageUrl: string
}

export interface SecretSummary {
  name: string
  label: string
  description: string
  tokenPageUrl: string
  isSet: boolean
  lastFour: string | null
  updatedAt: string | null
}

export interface SecretTestResult {
  ok: boolean
  status: number | null
  message: string
}

export interface ApiError {
  error: string
}

export interface SignedInUser {
  login: string
  avatarUrl: string
}

export interface SessionState {
  signInRequired: boolean
  signInAvailable: boolean
  user: SignedInUser | null
}

export type AgentProvider = 'claude' | 'codex'

// `inactive` is a session that never reported its end but has been silent too long to be
// running: a closed terminal, a crashed machine.
export type AgentSessionState = 'working' | 'waiting' | 'idle' | 'ended' | 'inactive'

export interface TokenTotals {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
  total: number
}

export interface AgentSessionSummary {
  sessionId: string
  provider: AgentProvider
  repository: RepositoryReference | null
  branch: string | null
  issueNumber: number | null
  state: AgentSessionState
  startedAt: string
  lastEventAt: string
  tokens: TokenTotals
}

export interface SessionTimelineSegment {
  sessionId: string
  state: AgentSessionState
  startedAt: string
  endedAt: string
}

export interface SessionsOverview {
  sessions: AgentSessionSummary[]
  timeline: SessionTimelineSegment[]
  windowStartedAt: string
  generatedAt: string
}

export interface UsageByRepository {
  repository: RepositoryReference | null
  tokens: TokenTotals
  sessionCount: number
}

export interface UsageByWork {
  repository: RepositoryReference | null
  branch: string | null
  issueNumber: number | null
  pullRequestNumber: number | null
  tokens: TokenTotals
  sessionCount: number
}

export interface UsageByDay {
  day: string
  tokens: TokenTotals
}

export interface UsageByModel {
  model: string
  tokens: TokenTotals
}

export interface UsageReport {
  windowStartedAt: string
  generatedAt: string
  totals: TokenTotals
  sessionCount: number
  byRepository: UsageByRepository[]
  byWork: UsageByWork[]
  byDay: UsageByDay[]
  byModel: UsageByModel[]
}

export interface MachineTokenSummary {
  tokenId: string
  label: string
  createdAt: string
  lastUsedAt: string | null
}

export type MachineTokenKind = 'ingest' | 'runner'

export interface CreatedMachineToken {
  summary: MachineTokenSummary
  token: string
}

export type StartWorkflow =
  | 'research'
  | 'feature'
  | 'fix'
  | 'refactor'
  | 'docs'
  | 'design'
  | '3d'
  | 'security'
  | 'tests'
  | 'chore'

export type StartTarget = 'laptop-remote-control' | 'laptop-headless' | 'laptop-cloud' | 'cloud-routine'

export type HeadlessPermissionMode = 'auto' | 'acceptEdits' | 'dontAsk'

export type SessionStartState = 'queued' | 'claimed' | 'started' | 'failed'

export interface SessionStartRequest {
  repository: RepositoryReference
  issueNumber: number | null
  workflow: StartWorkflow
  target: StartTarget
  permissionMode: HeadlessPermissionMode
  note: string
}

export interface SessionStart extends SessionStartRequest {
  startId: string
  state: SessionStartState
  runnerLabel: string | null
  sessionUrl: string | null
  message: string | null
  createdAt: string
  updatedAt: string
}

export interface RunnerPresence {
  label: string
  lastSeenAt: string
  isOnline: boolean
}

export interface StartOptions {
  runners: RunnerPresence[]
  routineConfigured: boolean
}

export interface RoutineSettings {
  configured: boolean
  routineId: string | null
}
