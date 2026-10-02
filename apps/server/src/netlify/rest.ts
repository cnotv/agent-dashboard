import type { NetlifyFetcher } from './types.ts'

const netlifyApiUrl = 'https://api.netlify.com'

/**
 * Creates a caller for the Netlify API with one personal access token.
 * @param token The Netlify token saved under Credentials.
 * @returns The fetcher, which returns the raw response.
 */
export const createNetlifyFetcher =
  (token: string): NetlifyFetcher =>
  (path, request = { method: 'GET' }) =>
    fetch(`${netlifyApiUrl}${path}`, {
      method: request.method,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'dashi' },
      signal: AbortSignal.timeout(30000),
    })
