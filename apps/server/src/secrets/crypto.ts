import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { EncryptedValue } from './types.ts'

const cipherAlgorithm = 'aes-256-gcm'
const keyLengthInBytes = 32
const initializationVectorLengthInBytes = 12

// scrypt cost chosen so an unlock takes a noticeable fraction of a second: cheap once per
// restart, expensive for anyone guessing passphrases against a stolen database.
const scryptParameters = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

/**
 * Creates a new random master key.
 * @returns 32 random bytes.
 */
export const generateKeyMaterial = (): Buffer => randomBytes(keyLengthInBytes)

/**
 * Creates a new random salt for deriving a key from a passphrase.
 * @returns 16 random bytes.
 */
export const generateSalt = (): Buffer => randomBytes(16)

/**
 * Decodes a base64 master key from the environment and checks its length.
 * @param encodedKey The base64 key.
 * @returns The 32-byte key; throws when it is any other size.
 */
export const parseEncodedKey = (encodedKey: string): Buffer => {
  const decodedKey = Buffer.from(encodedKey.trim(), 'base64')
  if (decodedKey.length !== keyLengthInBytes) {
    throw new Error(`The master key must be ${keyLengthInBytes} bytes, base64 encoded`)
  }
  return decodedKey
}

/**
 * Derives the master key from a passphrase with scrypt.
 * @param passphrase The passphrase, normalised so the same words always give the same key.
 * @param salt The vault's stored salt.
 * @returns The 32-byte key.
 */
export const deriveKeyFromPassphrase = (passphrase: string, salt: Buffer): Buffer =>
  scryptSync(passphrase.normalize('NFKC'), salt, keyLengthInBytes, scryptParameters)

/**
 * Encrypts a secret with AES-256-GCM under a fresh initialisation vector.
 * The associated data binds each ciphertext to its secret name, so a row copied onto
 * another name fails authentication instead of decrypting under the wrong label.
 * @param key The master key.
 * @param plaintext The secret value.
 * @param associatedData The secret's name.
 * @returns The ciphertext, initialisation vector and authentication tag, base64 encoded.
 */
export const encryptValue = (key: Buffer, plaintext: string, associatedData: string): EncryptedValue => {
  const initializationVector = randomBytes(initializationVectorLengthInBytes)
  const cipher = createCipheriv(cipherAlgorithm, key, initializationVector)
  cipher.setAAD(Buffer.from(associatedData, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    initializationVector: initializationVector.toString('base64'),
    authenticationTag: cipher.getAuthTag().toString('base64'),
  }
}

/**
 * Decrypts a secret and checks it was not altered or moved to another name.
 * @param key The master key.
 * @param encryptedValue The stored ciphertext, initialisation vector and tag.
 * @param associatedData The secret's name.
 * @returns The secret value; throws when the key, name or data is wrong.
 */
export const decryptValue = (key: Buffer, encryptedValue: EncryptedValue, associatedData: string): string => {
  const decipher = createDecipheriv(cipherAlgorithm, key, Buffer.from(encryptedValue.initializationVector, 'base64'))
  decipher.setAAD(Buffer.from(associatedData, 'utf8'))
  decipher.setAuthTag(Buffer.from(encryptedValue.authenticationTag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue.ciphertext, 'base64')), decipher.final()]).toString('utf8')
}

/**
 * Keeps the last four characters of a secret, the only part the browser ever sees.
 * @param value The secret value.
 * @returns Its last four characters.
 */
export const lastFourCharacters = (value: string): string => value.slice(-4)
