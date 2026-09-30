import type { BoardCard, BoardColumn, CheckGate, IssueLabel, IssueSummary, MediaKind } from '@agent-dashboard/contracts'
import type { DemoPullRequestOutcome } from '@/lib/types'

// Served from apps/web/public so demo mode has a recording to open without any server.
export const demoMediaUrls: Record<MediaKind, string> = {
  image: '/demo-media/screenshot.png',
  video: '/demo-media/video.webm',
}

const issueOf = (issueNumber: number, title: string, linkedPullRequestNumbers: number[], labels: IssueLabel[] = []): IssueSummary => ({
  number: issueNumber,
  title,
  url: `https://github.com/cnotv/example/issues/${issueNumber}`,
  updatedAt: '2026-09-27T10:00:00Z',
  labels,
  linkedPullRequestNumbers,
})

const runUrl = (runNumber: number): string => `https://github.com/cnotv/example/runs/${runNumber}`

const failingGates: CheckGate[] = [
  { name: 'lint', state: 'success', url: runUrl(1) },
  { name: 'typecheck', state: 'success', url: runUrl(2) },
  { name: 'test', state: 'failure', url: runUrl(3) },
  { name: 'e2e', state: 'pending', url: runUrl(4) },
  { name: 'lighthouse', state: 'skipped', url: runUrl(5) },
  { name: 'deploy/netlify', state: 'success', url: 'https://deploy-preview-30--cnotv-example.netlify.app' },
]

const passingGates: CheckGate[] = [
  { name: 'lint', state: 'success', url: runUrl(11) },
  { name: 'typecheck', state: 'success', url: runUrl(12) },
  { name: 'test', state: 'success', url: runUrl(13) },
  { name: 'deploy/netlify', state: 'success', url: 'https://deploy-preview-29--cnotv-example.netlify.app' },
]

export const sampleBoardColumns: BoardColumn[] = [
  {
    status: 'no-pull-request',
    cards: [
      {
        issues: [issueOf(12, 'Add a camera preset', [], [{ name: 'enhancement', color: 'a2eeef' }])],
        pullRequest: null,
        status: 'no-pull-request',
      },
    ],
  },
  {
    status: 'draft',
    cards: [
      {
        issues: [],
        pullRequest: {
          number: 31,
          title: 'chore: tidy',
          url: 'https://github.com/cnotv/example/pull/31',
          isDraft: true,
          headRefName: 'claude/tidy-things',
          headSha: 'fedc9876',
          reviewDecision: null,
          mergeable: 'UNKNOWN',
          body: '',
          updatedAt: '2026-09-25T12:00:00Z',
          gates: [],
          gateSummary: { passed: 0, failed: 0, pending: 0, total: 0, overallState: 'none' },
          media: { hasImage: false, hasVideo: false },
          previewUrl: null,
        },
        status: 'draft',
      },
    ],
  },
  { status: 'checks-running', cards: [] },
  {
    status: 'checks-failing',
    cards: [
      {
        issues: [issueOf(7, 'Fix marble stickiness', [30]), issueOf(8, 'Marbles pass through the ramp edge', [30], [{ name: 'bug', color: 'd73a4a' }])],
        pullRequest: {
          number: 30,
          title: 'fix: marble collisions (#7)',
          url: 'https://github.com/cnotv/example/pull/30',
          isDraft: false,
          headRefName: 'fix/7-marble-stickiness',
          headSha: '0123abcd',
          reviewDecision: 'REVIEW_REQUIRED',
          mergeable: 'MERGEABLE',
          body: 'Closes #7\nCloses #8\n\nPreview route: /games/MarbleMadness',
          updatedAt: '2026-09-27T12:00:00Z',
          gates: failingGates,
          gateSummary: { passed: 3, failed: 1, pending: 1, total: 6, overallState: 'failing' },
          media: { hasImage: true, hasVideo: true },
          previewUrl: 'https://deploy-preview-30--cnotv-example.netlify.app/games/MarbleMadness',
        },
        status: 'checks-failing',
      },
    ],
  },
  {
    status: 'ready-for-review',
    cards: [
      {
        issues: [issueOf(5, 'Show the score after each round', [29])],
        pullRequest: {
          number: 29,
          title: 'feat: round score (#5)',
          url: 'https://github.com/cnotv/example/pull/29',
          isDraft: false,
          headRefName: 'feat/5-round-score',
          headSha: '4567cdef',
          reviewDecision: 'REVIEW_REQUIRED',
          mergeable: 'CONFLICTING',
          body: 'Closes #5',
          updatedAt: '2026-09-26T12:00:00Z',
          gates: passingGates,
          gateSummary: { passed: 4, failed: 0, pending: 0, total: 4, overallState: 'passing' },
          media: { hasImage: false, hasVideo: false },
          previewUrl: 'https://deploy-preview-29--cnotv-example.netlify.app',
        },
        status: 'ready-for-review',
      },
    ],
  },
  { status: 'approved', cards: [] },
]

/**
 * Shows the board as it would look after demo merges and closes: a merged pull request takes its
 * issues with it, as the Closes lines would on GitHub, and a closed one leaves each of its issues
 * behind on a card of its own with no pull request.
 * @param columns The sample board's columns.
 * @param outcomes What happened to each changed pull request, by number.
 * @returns The columns with the changed cards moved or removed.
 */
export const applyDemoPullRequestOutcomes = (
  columns: BoardColumn[],
  outcomes: Map<number, DemoPullRequestOutcome>,
): BoardColumn[] => {
  const cards = columns.flatMap((column) => column.cards).flatMap((card): BoardCard[] => {
    const outcome = card.pullRequest ? outcomes.get(card.pullRequest.number) : undefined
    if (outcome === undefined) return [card]
    if (outcome === 'merged') return []
    return card.issues.map((issue) => ({ issues: [issue], pullRequest: null, status: 'no-pull-request' }))
  })
  return columns.map((column) => ({ ...column, cards: cards.filter((card) => card.status === column.status) }))
}
