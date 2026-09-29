import { createHash, randomBytes } from 'node:crypto'

export const createRandomToken = (): string => randomBytes(32).toString('base64url')

export const codeChallengeFor = (codeVerifier: string): string => createHash('sha256').update(codeVerifier).digest('base64url')
