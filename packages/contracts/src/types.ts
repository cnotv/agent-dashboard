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
  issue: IssueSummary | null
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
}

export interface SecretSummary {
  name: string
  label: string
  description: string
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
