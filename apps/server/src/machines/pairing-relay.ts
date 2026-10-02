import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import type { CreatedPairing, PairingRequest } from '@dashi/contracts'
import type { PairingRelay, PairingTokens } from './types.ts'

// Long enough to read the code, switch to the browser and sign in; short enough that a code
// nobody approved is gone before anyone could guess it.
const pairingMilliseconds = 10 * 60_000
const pendingPairingLimit = 20
// No 0/O, 1/I/L: the code is read off one screen and typed or checked on another.
const userCodeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const userCodeLength = 8

interface HeldPairing {
  pairingId: string
  userCode: string
  pollSecretHash: Buffer
  request: PairingRequest
  expiresAt: number
  tokens: PairingTokens | null
}

const hashOf = (text: string): Buffer => createHash('sha256').update(text).digest()

const newUserCode = (): string => {
  const characters = Array.from({ length: userCodeLength }, () => userCodeAlphabet[randomInt(userCodeAlphabet.length)])
  return `${characters.slice(0, 4).join('')}-${characters.slice(4).join('')}`
}

/**
 * Normalises a code as typed: upper case, the dash optional.
 * @param typedCode The code as entered.
 * @returns The code in the XXXX-XXXX form it was issued in.
 */
export const normaliseUserCode = (typedCode: string): string => {
  const compact = typedCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return compact.length === userCodeLength ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact
}

/**
 * Creates the in-memory pairings between a CLI that asked to connect a machine and the person who
 * approves it in the dashboard. Only a hash of each poll secret is kept, and the tokens an
 * approval made are handed to the CLI once and then dropped; a restart forgets every pairing.
 * @param now The clock.
 * @returns The relay.
 */
export const createPairingRelay = (now: () => number): PairingRelay => {
  const pairings = new Map<string, HeldPairing>()

  const dropExpired = (): void =>
    [...pairings.values()].filter((pairing) => pairing.expiresAt <= now()).forEach((pairing) => pairings.delete(pairing.pairingId))

  const findByCode = (userCode: string): HeldPairing | undefined =>
    [...pairings.values()].find((pairing) => pairing.userCode === normaliseUserCode(userCode) && pairing.expiresAt > now())

  return {
    create: (request) => {
      dropExpired()
      if (pairings.size >= pendingPairingLimit) return null
      const pollSecret = randomBytes(32).toString('base64url')
      const pairing: HeldPairing = {
        pairingId: randomUUID(),
        userCode: newUserCode(),
        pollSecretHash: hashOf(pollSecret),
        request,
        expiresAt: now() + pairingMilliseconds,
        tokens: null,
      }
      pairings.set(pairing.pairingId, pairing)
      const created: CreatedPairing = {
        pairingId: pairing.pairingId,
        userCode: pairing.userCode,
        pollSecret,
        approvePath: `/pair?code=${pairing.userCode}`,
        expiresAt: new Date(pairing.expiresAt).toISOString(),
      }
      return created
    },
    describe: (userCode) => {
      const pairing = findByCode(userCode)
      return pairing === undefined || pairing.tokens !== null
        ? null
        : { userCode: pairing.userCode, ...pairing.request, expiresAt: new Date(pairing.expiresAt).toISOString() }
    },
    approve: (userCode, tokens) => {
      const pairing = findByCode(userCode)
      if (pairing === undefined || pairing.tokens !== null) return false
      pairings.set(pairing.pairingId, { ...pairing, tokens })
      return true
    },
    poll: (pairingId, pollSecret) => {
      const pairing = pairings.get(pairingId)
      if (pairing === undefined) return { outcome: 'unknown' }
      if (!timingSafeEqual(pairing.pollSecretHash, hashOf(pollSecret))) return { outcome: 'refused' }
      if (pairing.expiresAt <= now()) {
        pairings.delete(pairingId)
        return { outcome: 'expired' }
      }
      if (pairing.tokens === null) return { outcome: 'answered', poll: { state: 'pending' } }
      pairings.delete(pairingId)
      return { outcome: 'answered', poll: { state: 'approved', ...pairing.tokens } }
    },
  }
}
