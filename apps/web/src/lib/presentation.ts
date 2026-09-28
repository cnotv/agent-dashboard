import type { GateOverallState, GateState, IssueStatus } from '@agent-dashboard/contracts'

export const issueStatusLabels: Record<IssueStatus, string> = {
  'no-pull-request': 'No pull request',
  draft: 'Draft',
  'checks-running': 'Checks running',
  'checks-failing': 'Checks failing',
  'ready-for-review': 'Ready for review',
  approved: 'Approved',
}

export const gateStateClasses: Record<GateState, string> = {
  success: 'bg-success/15 text-success border-success/30',
  failure: 'bg-destructive/15 text-destructive border-destructive/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  neutral: 'bg-muted text-muted-foreground',
  skipped: 'bg-muted text-muted-foreground',
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
