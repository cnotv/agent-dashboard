import { bodyLimit } from 'hono/body-limit'

/**
 * Reads a request's JSON body without throwing.
 * @param request The request.
 * @returns The parsed body, or null when it is missing or not JSON.
 */
export const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/**
 * Takes the token out of an Authorization header of the form "Bearer <token>".
 * @param authorizationHeader The header, if sent.
 * @returns The token, or undefined when the header is missing or of another scheme.
 */
export const bearerTokenOf = (authorizationHeader: string | undefined): string | undefined =>
  authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice('Bearer '.length).trim() : undefined

/**
 * Refuses a request body larger than the given size with a 413.
 * @param maxSize The largest body accepted, in bytes.
 * @returns The middleware.
 */
export const limitTo = (maxSize: number) =>
  bodyLimit({ maxSize, onError: (context) => context.json({ error: 'The body is too large' }, 413) })
