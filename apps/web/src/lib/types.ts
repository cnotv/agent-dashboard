import type {
  Board,
  BoardCard,
  IssueStatus,
  RepositoryReference,
  SecretSummary,
  SessionState,
  SecretTestResult,
  VaultState,
} from '@agent-dashboard/contracts'

export type RadixColor = 'gray' | 'blue' | 'indigo' | 'amber' | 'red' | 'green' | 'jade' | 'sky'

export interface BoardTableRow {
  rowKey: string
  card: BoardCard
  status: IssueStatus
  statusLabel: string
  issueTitle: string
  pullRequestTitle: string
  gatesPassed: number
  updatedAt: string
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
}

export interface RuntimeConfiguration {
  isDemoMode: boolean
  apiBaseUrl: string
}
