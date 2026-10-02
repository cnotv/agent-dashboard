import type { GithubRestFetcher } from './types.ts'

const githubApiUrl = 'https://api.github.com'

/**
 * Creates a REST caller for the GitHub API with one token: reads, and the merge and close writes.
 * fetch drops the Authorization header when GitHub redirects a download to its storage host,
 * so the token never reaches the signed storage link.
 * @param token A user token or the stored GitHub token.
 * @returns The fetcher, which returns the raw response.
 */
export const createGithubRestFetcher =
  (token: string): GithubRestFetcher =>
  (path, request = { method: 'GET' }) =>
    fetch(`${githubApiUrl}${path}`, {
      method: request.method,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'dashi',
      },
      signal: AbortSignal.timeout(30000),
    })
