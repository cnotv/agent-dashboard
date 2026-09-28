import type { GateOverallState, GateState, IssueStatus } from '@agent-dashboard/contracts'
import type { RadixColor } from './types'

export const issueStatusLabels: Record<IssueStatus, string> = {
  'no-pull-request': 'No pull request',
  draft: 'Draft',
  'checks-running': 'Checks running',
  'checks-failing': 'Checks failing',
  'ready-for-review': 'Ready for review',
  approved: 'Approved',
}

export const issueStatusColors: Record<IssueStatus, RadixColor> = {
  'no-pull-request': 'gray',
  draft: 'sky',
  'checks-running': 'amber',
  'checks-failing': 'red',
  'ready-for-review': 'indigo',
  approved: 'green',
}

export const gateStateColors: Record<GateState, RadixColor> = {
  success: 'green',
  failure: 'red',
  pending: 'amber',
  neutral: 'gray',
  skipped: 'gray',
}

export const gateOverallLabels: Record<GateOverallState, string> = {
  none: 'No checks',
  passing: 'All checks passed',
  running: 'Checks running',
  failing: 'Checks failing',
}

export const repositoryKey = (repository: { owner: string; name: string }): string => `${repository.owner}/${repository.name}`

export const parseRepositoryKey = (key: string): { owner: string; name: string } | null => {
  const [owner, name, ...extraParts] = key.split('/')
  return owner && name && extraParts.length === 0 ? { owner, name } : null
}

export const errorMessageOf = (errorOrText: unknown): string =>
  errorOrText instanceof Error ? errorOrText.message : String(errorOrText)
