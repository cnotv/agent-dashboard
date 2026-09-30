import type { RepositoryReference } from '@agent-dashboard/contracts'
import { githubErrorSchema } from './schema.ts'
import type { GithubRestFetcher, PullRequestActionResult, PullRequestToMerge } from './types.ts'

const pullRequestPath = (repository: RepositoryReference, pullRequestNumber: number): string =>
  `/repos/${repository.owner}/${repository.name}/pulls/${pullRequestNumber}`

const resultOf = async (response: Response): Promise<PullRequestActionResult> => {
  if (response.ok) return { ok: true }
  const parsedError = githubErrorSchema.safeParse(await response.json().catch(() => null))
  return { ok: false, status: response.status, message: parsedError.success ? parsedError.data.message : `GitHub answered ${response.status}` }
}

/**
 * Squash-merges a pull request, titled as the repository's convention wants it on main: the pull
 * request's title followed by its number. GitHub would otherwise reuse the commit subject when
 * there is a single commit, and the issue number in the title would be lost.
 * The head SHA is sent along, so a push made after the board was read makes GitHub refuse the
 * merge instead of merging code nobody looked at.
 * @param fetchGithub The REST caller, holding the reader's token.
 * @param repository The repository.
 * @param pullRequest The number, title and head SHA the board showed.
 * @returns Whether GitHub merged it, and its reason when it did not.
 */
export const mergePullRequest = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
  pullRequest: PullRequestToMerge,
): Promise<PullRequestActionResult> =>
  resultOf(
    await fetchGithub(`${pullRequestPath(repository, pullRequest.number)}/merge`, {
      method: 'PUT',
      body: { merge_method: 'squash', commit_title: `${pullRequest.title} (#${pullRequest.number})`, sha: pullRequest.headSha },
    }),
  )

/**
 * Closes a pull request without merging it. Its branch stays, so it can be reopened on GitHub.
 * @param fetchGithub The REST caller, holding the reader's token.
 * @param repository The repository.
 * @param pullRequestNumber The pull request to close.
 * @returns Whether GitHub closed it, and its reason when it did not.
 */
export const closePullRequest = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
  pullRequestNumber: number,
): Promise<PullRequestActionResult> =>
  resultOf(await fetchGithub(pullRequestPath(repository, pullRequestNumber), { method: 'PATCH', body: { state: 'closed' } }))
