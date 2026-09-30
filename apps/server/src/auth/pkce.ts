import { createHash, randomBytes } from 'node:crypto'

/**
 * Creates an unguessable token for a state value, a PKCE verifier or a session id.
 * @returns 32 random bytes, base64url encoded.
 */
export const createRandomToken = (): string => randomBytes(32).toString('base64url')

/**
 * Derives the PKCE S256 challenge GitHub checks the verifier against.
 * @param codeVerifier The verifier kept on the server until the callback.
 * @returns The SHA-256 of the verifier, base64url encoded.
 */
export const codeChallengeFor = (codeVerifier: string): string => createHash('sha256').update(codeVerifier).digest('base64url')
