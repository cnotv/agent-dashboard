import type { Board, BoardCard } from '@dashi/contracts'
import type { RepositoryBoardColumn } from './types'

const lastUpdateOf = (card: BoardCard): string =>
  [card.pullRequest?.updatedAt, ...card.issues.map((issue) => issue.updatedAt)]
    .filter((updatedAt) => updatedAt !== undefined)
    .reduce((latest, updatedAt) => (updatedAt > latest ? updatedAt : latest), '')

/**
 * Lays several repositories' boards out as one: the same columns, each holding every
 * repository's cards for that status, most recently updated first.
 * @param boards The boards, one per repository, each with every column in the board's order.
 * @returns The columns, each card paired with its repository.
 */
export const mergeBoards = (boards: Board[]): RepositoryBoardColumn[] =>
  (boards[0]?.columns ?? []).map(({ status }) => ({
    status,
    cards: boards
      .flatMap((board) =>
        (board.columns.find((column) => column.status === status)?.cards ?? []).map((card) => ({ card, repository: board.repository })),
      )
      .sort((first, second) => lastUpdateOf(second.card).localeCompare(lastUpdateOf(first.card))),
  }))
