import type { BoardCard, IssueStatus } from '@agent-dashboard/contracts'

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
