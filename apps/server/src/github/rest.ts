import type { GithubRestFetcher } from '../media/types.ts'

const githubApiUrl = 'https://api.github.com'

/**
 * Creates a REST caller that reads the GitHub API with one token.
 * fetch drops the Authorization header when GitHub redirects a download to its storage host,
 * so the token never reaches the signed storage link.
 * @param token A user token or the stored GitHub token.
 * @returns The fetcher, which returns the raw response.
 */
export const createGithubRestFetcher =
  (token: string): GithubRestFetcher =>
  (path) =>
    fetch(`${githubApiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'agent-dashboard',
      },
      signal: AbortSignal.timeout(30000),
    })
