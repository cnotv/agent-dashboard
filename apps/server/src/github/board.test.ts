import { describe, expect, it } from 'vitest'
import { fetchRepositoryBoard } from './board.ts'
import boardResponseFixture from './fixtures/board-response.json' with { type: 'json' }

const repository = { owner: 'cnotv', name: 'generative-art' }

describe('fetchRepositoryBoard', () => {
  it('maps a GitHub response into columns', async () => {
    const board = await fetchRepositoryBoard(async () => boardResponseFixture, repository)
    const cardsByStatus = Object.fromEntries(board.columns.map((column) => [column.status, column.cards]))

    expect(cardsByStatus['no-pull-request']?.map((card) => card.issues.map((issue) => issue.number))).toEqual([[12]])
    expect(cardsByStatus['checks-failing']?.map((card) => card.issues.map((issue) => issue.number))).toEqual([[7]])

    const failingPullRequest = cardsByStatus['checks-failing']?.[0]?.pullRequest
    expect(failingPullRequest?.headSha).toBe('0123abcd')
    expect(failingPullRequest?.gates).toEqual([
      { name: 'lint', state: 'success', url: 'https://github.com/cnotv/generative-art/runs/1' },
      { name: 'test', state: 'failure', url: 'https://github.com/cnotv/generative-art/runs/2' },
      { name: 'deploy/netlify', state: 'pending', url: 'https://app.netlify.com/x' },
    ])
    expect(failingPullRequest?.gateSummary.overallState).toBe('failing')
    expect(cardsByStatus['draft']?.map((card) => card.pullRequest?.number)).toEqual([31])
    expect(cardsByStatus['closed']?.map((card) => card.issues.map((issue) => [issue.number, issue.closedAt, issue.linkedPullRequestNumbers]))).toEqual([
      [[4, '2026-09-20T10:00:00Z', [5]]],
    ])
  })

  it('passes owner and name as variables, never inside the query text', async () => {
    const receivedVariables: Record<string, string | number>[] = []
    await fetchRepositoryBoard(async (_query, variables) => {
      receivedVariables.push(variables)
      return boardResponseFixture
    }, repository)
    expect(receivedVariables).toEqual([{ owner: 'cnotv', name: 'generative-art' }])
  })

  it("passes on GitHub's reason when it cannot see the repository", async () => {
    const notFoundResponse = {
      data: { repository: null },
      errors: [{ type: 'NOT_FOUND', message: "Could not resolve to a Repository with the name 'cnotv/generative-art'." }],
    }
    await expect(fetchRepositoryBoard(async () => notFoundResponse, repository)).rejects.toThrow(
      "Could not resolve to a Repository with the name 'cnotv/generative-art'. Check that cnotv/generative-art in config/repos.json",
    )
  })

  it('rejects a response of the wrong shape', async () => {
    await expect(fetchRepositoryBoard(async () => ({ data: { repository: null } }), repository)).rejects.toThrow(
      'Unexpected GitHub response',
    )
  })
})
