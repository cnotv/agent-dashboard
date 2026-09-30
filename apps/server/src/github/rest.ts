import type { GithubRestFetcher } from '../media/types.ts'

const githubApiUrl = 'https://api.github.com'

// fetch drops the Authorization header when GitHub redirects a download to its storage host,
// so the token never reaches the signed storage link.
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
