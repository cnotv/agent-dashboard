import type { NewIssueRequest, RepositoryReference } from '@dashi/contracts'
import { createdIssueSchema, githubErrorSchema } from './schema.ts'
import type { GithubRestFetcher, IssueCreationResult } from './types.ts'

/**
 * Opens an issue with the reader's token, so GitHub shows them as its author.
 * @param fetchGithub The REST caller, holding the reader's token.
 * @param repository The repository.
 * @param newIssue The title and body.
 * @returns The new issue's number and address, or GitHub's reason for refusing.
 */
export const createIssue = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
  newIssue: NewIssueRequest,
): Promise<IssueCreationResult> => {
  const response = await fetchGithub(`/repos/${repository.owner}/${repository.name}/issues`, { method: 'POST', body: newIssue })
  const responseBody: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsedError = githubErrorSchema.safeParse(responseBody)
    return { ok: false, status: response.status, message: parsedError.success ? parsedError.data.message : `GitHub answered ${response.status}` }
  }
  const parsedIssue = createdIssueSchema.safeParse(responseBody)
  return parsedIssue.success
    ? { ok: true, issue: { number: parsedIssue.data.number, url: parsedIssue.data.html_url } }
    : { ok: false, status: 502, message: 'Unexpected answer from GitHub' }
}
