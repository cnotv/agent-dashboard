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

/**
 * Reads the issue number from a branch named <type>/<number>-<description>.
 * @param branchName The branch name.
 * @returns The issue number, or null when the branch does not follow the convention.
 */
export const issueNumberFromBranch = (branchName: string): number | null => {
  const branchMatch = branchIssuePattern.exec(branchName)
  return branchMatch?.[1] === undefined ? null : Number(branchMatch[1])
}

/**
 * Maps a check run's status and conclusion to a gate state.
 * @param status The run's status, such as COMPLETED.
 * @param conclusion The run's conclusion once completed.
 * @returns The gate state.
 */
export const gateStateFromCheckRun = (status: string, conclusion: string | null): GateState => {
  if (status !== 'COMPLETED') return 'pending'
  if (conclusion === 'SUCCESS') return 'success'
  if (conclusion === 'SKIPPED') return 'skipped'
  if (conclusion === 'NEUTRAL' || conclusion === 'STALE') return 'neutral'
  return 'failure'
}

/**
 * Maps a legacy commit status to a gate state.
 * @param state The status state, such as SUCCESS.
 * @returns The gate state.
 */
export const gateStateFromStatusContext = (state: string): GateState => {
  if (state === 'SUCCESS') return 'success'
  if (state === 'PENDING' || state === 'EXPECTED') return 'pending'
  return 'failure'
}

/**
 * Counts a pull request's gates and settles on one overall state: failing wins over running, running over passing.
 * @param gates The pull request's gates.
 * @returns The counts and the overall state.
 */
export const summariseGates = (gates: CheckGate[]): GateSummary => {
  const countGates = (state: GateState): number => gates.filter((gate) => gate.state === state).length
  const passed = countGates('success')
  const failed = countGates('failure')
  const pending = countGates('pending')
  const overallState = gates.length === 0 ? 'none' : failed > 0 ? 'failing' : pending > 0 ? 'running' : 'passing'
  return { passed, failed, pending, total: gates.length, overallState }
}

/**
 * Picks the board column for an issue from its pull request.
 * @param pullRequest The pull request that closes the issue, or null.
 * @returns The column.
 */
export const deriveIssueStatus = (pullRequest: PullRequestSummary | null): IssueStatus => {
  if (pullRequest === null) return 'no-pull-request'
  if (pullRequest.isDraft) return 'draft'
  if (pullRequest.gateSummary.overallState === 'failing') return 'checks-failing'
  if (pullRequest.gateSummary.overallState === 'running') return 'checks-running'
  if (pullRequest.reviewDecision === 'APPROVED') return 'approved'
  return 'ready-for-review'
}

/**
 * Tells whether a pull request belongs to an issue, by GitHub's closing link or by the branch's issue number.
 * @param pullRequest The pull request.
 * @param issue The issue.
 * @returns True when the pull request works on the issue.
 */
export const pullRequestClosesIssue = (pullRequest: PullRequestSummary, issue: IssueSummary): boolean =>
  issue.linkedPullRequestNumbers.includes(pullRequest.number) || issueNumberFromBranch(pullRequest.headRefName) === issue.number

const newestFirst = (first: { updatedAt: string }, second: { updatedAt: string }): number =>
  second.updatedAt.localeCompare(first.updatedAt)

/**
 * Pairs each issue with its newest pull request, and gives pull requests without an issue cards of their own.
 * @param issues The open issues.
 * @param pullRequests The open pull requests.
 * @returns One card per issue and per unpaired pull request.
 */
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

/**
 * Builds a repository's board, with the cards sorted into columns in the board's order.
 * @param repository The repository.
 * @param issues The open issues.
 * @param pullRequests The open pull requests.
 * @param fetchedAt When GitHub was read.
 * @returns The board.
 */
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
