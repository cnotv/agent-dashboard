import type { SecretTestResult } from '@agent-dashboard/contracts'
import type { SecretDefinitionWithTester, SecretTester } from './types.ts'

const testTimeoutMilliseconds = 8000

/**
 * Builds the headers that present a key to its provider, the way that provider expects it.
 * @param tester The provider's test endpoint and header style.
 * @param secretValue The key to present.
 * @returns The request headers.
 */
export const buildTesterHeaders = (tester: SecretTester, secretValue: string): Record<string, string> => ({
  ...tester.extraHeaders,
  ...(tester.credentialHeader === 'bearer' ? { Authorization: `Bearer ${secretValue}` } : { 'x-api-key': secretValue }),
})

/**
 * Checks a stored key against its provider with one read-only request, answering only whether it was accepted.
 * @param definition The secret and its tester.
 * @param secretValue The key to check.
 * @returns Whether the provider accepted it, never the key or the provider's body.
 */
export const testSecretAgainstProvider = async (
  definition: SecretDefinitionWithTester,
  secretValue: string,
): Promise<SecretTestResult> => {
  if (definition.tester === null) return { ok: false, status: null, message: 'This secret has no test' }
  try {
    const providerResponse = await fetch(definition.tester.url, {
      headers: buildTesterHeaders(definition.tester, secretValue),
      signal: AbortSignal.timeout(testTimeoutMilliseconds),
    })
    return {
      ok: providerResponse.ok,
      status: providerResponse.status,
      message: providerResponse.ok ? 'The provider accepted the key' : 'The provider rejected the key',
    }
  } catch {
    return { ok: false, status: null, message: 'The provider could not be reached' }
  }
}
