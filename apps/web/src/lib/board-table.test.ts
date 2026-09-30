import { describe, expect, it } from 'vitest'
import type { BoardCard } from '@agent-dashboard/contracts'
import { boardTableRows } from './board-table'

const issueOnlyCard: BoardCard = {
  issue: { number: 12, title: 'Add a preset', url: 'u', updatedAt: '2026-09-27T10:00:00Z', labels: [], linkedPullRequestNumbers: [] },
  pullRequest: null,
  status: 'no-pull-request',
}

const pullRequestOnlyCard: BoardCard = {
  issue: null,
  pullRequest: {
    number: 31,
    title: 'chore: tidy',
    url: 'u',
    isDraft: true,
    headRefName: 'claude/tidy',
    headSha: null,
    reviewDecision: null,
    mergeable: 'UNKNOWN',
    body: '',
    media: { hasImage: false, hasVideo: false },
    updatedAt: '2026-09-28T10:00:00Z',
    gates: [],
    gateSummary: { passed: 0, failed: 0, pending: 0, total: 0, overallState: 'none' },
  },
  status: 'draft',
}

describe('boardTableRows', () => {
  it('flattens cards into searchable, sortable fields', () => {
    expect(boardTableRows([issueOnlyCard, pullRequestOnlyCard])).toEqual([
      expect.objectContaining({
        rowKey: 'issue-12',
        statusLabel: 'No pull request',
        issueTitle: '#12 Add a preset',
        pullRequestTitle: '',
        gatesPassed: -1,
        updatedAt: '2026-09-27T10:00:00Z',
      }),
      expect.objectContaining({
        rowKey: 'pull-31',
        statusLabel: 'Draft',
        issueTitle: '',
        pullRequestTitle: '#31 chore: tidy',
        gatesPassed: 0,
        updatedAt: '2026-09-28T10:00:00Z',
      }),
    ])
  })

  it('uses the most recent of the issue and pull request timestamps', () => {
    const [row] = boardTableRows([{ ...pullRequestOnlyCard, issue: issueOnlyCard.issue }])
    expect(row?.updatedAt).toBe('2026-09-28T10:00:00Z')
  })
})
