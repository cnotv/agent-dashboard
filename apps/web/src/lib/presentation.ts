import type { AgentProvider, AgentSessionState, GateOverallState, GateState, IssueStatus, RepositoryReference } from '@agent-dashboard/contracts'
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

export const signInErrorMessages: Record<string, string> = {
  expired: 'That sign-in link expired or was opened in another browser. Start again.',
  'not-allowed': 'This GitHub account is not on the list of people who may use this dashboard.',
  failed: 'GitHub did not complete the sign-in. Try again.',
}

export const sessionStateLabels: Record<AgentSessionState, string> = {
  working: 'Working',
  waiting: 'Waiting for you',
  idle: 'Idle',
  inactive: 'Inactive',
  ended: 'Ended',
}

export const sessionStateColors: Record<AgentSessionState, RadixColor> = {
  working: 'blue',
  waiting: 'orange',
  idle: 'jade',
  inactive: 'gray',
  ended: 'gray',
}

export const providerLabels: Record<AgentProvider, string> = { claude: 'Claude', codex: 'Codex' }

const compactNumberFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const fullNumberFormat = new Intl.NumberFormat('en')

export const formatCompactCount = (value: number): string =>
  value < 10_000 ? fullNumberFormat.format(value) : compactNumberFormat.format(value)

export const formatFullCount = (value: number): string => fullNumberFormat.format(value)

export const formatPercent = (share: number): string => `${Math.round(share * 100)}%`

const minuteMilliseconds = 60_000

export const formatDuration = (milliseconds: number): string => {
  const totalMinutes = Math.max(0, Math.round(milliseconds / minuteMilliseconds))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

export const formatTimeAgo = (isoTime: string, now: number): string => {
  const elapsed = now - Date.parse(isoTime)
  return elapsed < minuteMilliseconds ? 'just now' : `${formatDuration(elapsed)} ago`
}

export const gitHubIssueUrl = (repository: RepositoryReference, issueNumber: number): string =>
  `https://github.com/${repository.owner}/${repository.name}/issues/${issueNumber}`

export const gitHubPullRequestUrl = (repository: RepositoryReference, pullRequestNumber: number): string =>
  `https://github.com/${repository.owner}/${repository.name}/pull/${pullRequestNumber}`
