import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { EncryptedValue } from './types.ts'

const cipherAlgorithm = 'aes-256-gcm'
const keyLengthInBytes = 32
const initializationVectorLengthInBytes = 12

// scrypt cost chosen so an unlock takes a noticeable fraction of a second: cheap once per
// restart, expensive for anyone guessing passphrases against a stolen database.
const scryptParameters = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

export const generateKeyMaterial = (): Buffer => randomBytes(keyLengthInBytes)

export const generateSalt = (): Buffer => randomBytes(16)

export const parseEncodedKey = (encodedKey: string): Buffer => {
  const decodedKey = Buffer.from(encodedKey.trim(), 'base64')
  if (decodedKey.length !== keyLengthInBytes) {
    throw new Error(`The master key must be ${keyLengthInBytes} bytes, base64 encoded`)
  }
  return decodedKey
}

export const deriveKeyFromPassphrase = (passphrase: string, salt: Buffer): Buffer =>
  scryptSync(passphrase.normalize('NFKC'), salt, keyLengthInBytes, scryptParameters)

// The associated data binds each ciphertext to its secret name, so a row copied onto
// another name fails authentication instead of decrypting under the wrong label.
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

export const decryptValue = (key: Buffer, encryptedValue: EncryptedValue, associatedData: string): string => {
  const decipher = createDecipheriv(cipherAlgorithm, key, Buffer.from(encryptedValue.initializationVector, 'base64'))
  decipher.setAAD(Buffer.from(associatedData, 'utf8'))
  decipher.setAuthTag(Buffer.from(encryptedValue.authenticationTag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue.ciphertext, 'base64')), decipher.final()]).toString('utf8')
}

export const lastFourCharacters = (value: string): string => value.slice(-4)
