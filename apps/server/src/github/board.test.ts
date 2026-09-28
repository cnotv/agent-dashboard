import { describe, expect, it } from 'vitest'
import { fetchRepositoryBoard } from './board.ts'
import boardResponseFixture from './fixtures/board-response.json' with { type: 'json' }

const repository = { owner: 'cnotv', name: 'generative-art' }

describe('fetchRepositoryBoard', () => {
  it('maps a GitHub response into columns', async () => {
    const board = await fetchRepositoryBoard(async () => boardResponseFixture, repository)
    const cardsByStatus = Object.fromEntries(board.columns.map((column) => [column.status, column.cards]))

    expect(cardsByStatus['no-pull-request']?.map((card) => card.issue?.number)).toEqual([12])
    expect(cardsByStatus['checks-failing']?.map((card) => card.issue?.number)).toEqual([7])

    const failingPullRequest = cardsByStatus['checks-failing']?.[0]?.pullRequest
    expect(failingPullRequest?.headSha).toBe('0123abcd')
    expect(failingPullRequest?.gates).toEqual([
      { name: 'lint', state: 'success', url: 'https://github.com/cnotv/generative-art/runs/1' },
      { name: 'test', state: 'failure', url: 'https://github.com/cnotv/generative-art/runs/2' },
      { name: 'deploy/netlify', state: 'pending', url: 'https://app.netlify.com/x' },
    ])
    expect(failingPullRequest?.gateSummary.overallState).toBe('failing')
    expect(cardsByStatus['draft']?.map((card) => card.pullRequest?.number)).toEqual([31])
  })

  it('passes owner and name as variables, never inside the query text', async () => {
    const receivedVariables: Record<string, string>[] = []
    await fetchRepositoryBoard(async (_query, variables) => {
      receivedVariables.push(variables)
      return boardResponseFixture
    }, repository)
    expect(receivedVariables).toEqual([{ owner: 'cnotv', name: 'generative-art' }])
  })

  it('rejects a response of the wrong shape', async () => {
    await expect(fetchRepositoryBoard(async () => ({ data: { repository: null } }), repository)).rejects.toThrow(
      'Unexpected GitHub response',
    )
  })
})
