import type { BoardCard } from '@agent-dashboard/contracts'
import { issueStatusLabels } from './presentation'
import type { BoardTableRow } from './types'

const latestTimestamp = (card: BoardCard): string =>
  [card.issue?.updatedAt, card.pullRequest?.updatedAt]
    .filter((timestamp): timestamp is string => timestamp !== undefined)
    .reduce((latest, timestamp) => (timestamp > latest ? timestamp : latest), '')

/**
 * Flattens board cards into rows the table can sort and search.
 * The table sorts and searches on plain fields, so each card is flattened once here rather
 * than teaching every column how to reach into nested issue and pull request objects.
 * @param cards The board's cards.
 * @returns One row per card.
 */
export const boardTableRows = (cards: BoardCard[]): BoardTableRow[] =>
  cards.map((card) => ({
    rowKey: card.issue ? `issue-${card.issue.number}` : `pull-${card.pullRequest?.number ?? 'unknown'}`,
    card,
    status: card.status,
    statusLabel: issueStatusLabels[card.status],
    issueTitle: card.issue ? `#${card.issue.number} ${card.issue.title}` : '',
    pullRequestTitle: card.pullRequest ? `#${card.pullRequest.number} ${card.pullRequest.title}` : '',
    gatesPassed: card.pullRequest?.gateSummary.passed ?? -1,
    updatedAt: latestTimestamp(card),
  }))
