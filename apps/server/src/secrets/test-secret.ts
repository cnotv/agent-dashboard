import type { SecretTestResult } from '@agent-dashboard/contracts'
import type { SecretDefinitionWithTester, SecretTester } from './types.ts'

const testTimeoutMilliseconds = 8000

export const buildTesterHeaders = (tester: SecretTester, secretValue: string): Record<string, string> => ({
  ...tester.extraHeaders,
  ...(tester.credentialHeader === 'bearer' ? { Authorization: `Bearer ${secretValue}` } : { 'x-api-key': secretValue }),
})

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
