import type {
  Board,
  BoardCard,
  CheckGate,
  GateState,
  GateSummary,
  IssueStatus,
  IssueSummary,
  PullRequestSummary,
  RepositoryReference,
} from '@agent-dashboard/contracts'

const branchIssuePattern = /^(?:feat|fix|docs|refactor|test|chore)\/(\d+)-/

export const boardColumnOrder: IssueStatus[] = [
  'no-pull-request',
  'draft',
  'checks-running',
  'checks-failing',
  'ready-for-review',
  'approved',
]

export const issueNumberFromBranch = (branchName: string): number | null => {
  const branchMatch = branchIssuePattern.exec(branchName)
  return branchMatch?.[1] === undefined ? null : Number(branchMatch[1])
}

export const gateStateFromCheckRun = (status: string, conclusion: string | null): GateState => {
  if (status !== 'COMPLETED') return 'pending'
  if (conclusion === 'SUCCESS') return 'success'
  if (conclusion === 'SKIPPED') return 'skipped'
  if (conclusion === 'NEUTRAL' || conclusion === 'STALE') return 'neutral'
  return 'failure'
}

export const gateStateFromStatusContext = (state: string): GateState => {
  if (state === 'SUCCESS') return 'success'
  if (state === 'PENDING' || state === 'EXPECTED') return 'pending'
  return 'failure'
}

export const summariseGates = (gates: CheckGate[]): GateSummary => {
  const countGates = (state: GateState): number => gates.filter((gate) => gate.state === state).length
  const passed = countGates('success')
  const failed = countGates('failure')
  const pending = countGates('pending')
  const overallState = gates.length === 0 ? 'none' : failed > 0 ? 'failing' : pending > 0 ? 'running' : 'passing'
  return { passed, failed, pending, total: gates.length, overallState }
}

export const deriveIssueStatus = (pullRequest: PullRequestSummary | null): IssueStatus => {
  if (pullRequest === null) return 'no-pull-request'
  if (pullRequest.isDraft) return 'draft'
  if (pullRequest.gateSummary.overallState === 'failing') return 'checks-failing'
  if (pullRequest.gateSummary.overallState === 'running') return 'checks-running'
  if (pullRequest.reviewDecision === 'APPROVED') return 'approved'
  return 'ready-for-review'
}

export const pullRequestClosesIssue = (pullRequest: PullRequestSummary, issue: IssueSummary): boolean =>
  issue.linkedPullRequestNumbers.includes(pullRequest.number) || issueNumberFromBranch(pullRequest.headRefName) === issue.number

const newestFirst = (first: { updatedAt: string }, second: { updatedAt: string }): number =>
  second.updatedAt.localeCompare(first.updatedAt)

export const buildBoardCards = (issues: IssueSummary[], pullRequests: PullRequestSummary[]): BoardCard[] => {
  const issueCards = issues.map((issue) => {
    const linkedPullRequest =
      [...pullRequests].sort(newestFirst).find((pullRequest) => pullRequestClosesIssue(pullRequest, issue)) ?? null
    return { issue, pullRequest: linkedPullRequest, status: deriveIssueStatus(linkedPullRequest) }
  })
  const linkedPullRequestNumbers = new Set(issueCards.flatMap((card) => (card.pullRequest ? [card.pullRequest.number] : [])))
  const unlinkedPullRequestCards = pullRequests
    .filter((pullRequest) => !linkedPullRequestNumbers.has(pullRequest.number))
    .map((pullRequest) => ({ issue: null, pullRequest, status: deriveIssueStatus(pullRequest) }))
  return [...issueCards, ...unlinkedPullRequestCards]
}

export const buildBoard = (
  repository: RepositoryReference,
  issues: IssueSummary[],
  pullRequests: PullRequestSummary[],
  fetchedAt: string,
): Board => {
  const boardCards = buildBoardCards(issues, pullRequests)
  return {
    repository,
    columns: boardColumnOrder.map((status) => ({ status, cards: boardCards.filter((card) => card.status === status) })),
    fetchedAt,
  }
}
