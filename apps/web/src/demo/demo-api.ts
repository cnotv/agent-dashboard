import type { SecretSummary, VaultState } from '@agent-dashboard/contracts'
import type { DashboardApi } from '@/lib/types'
import { sampleBoardColumns } from './sample-board'
import { sampleRepositories, sampleSecrets } from './sample-data'

// Demo mode has no server: everything below lives in this page and is gone on reload, so a
// value typed into the credentials dialog never leaves the browser.
export const createDemoApi = (): DashboardApi => {
  const demoVaultState: VaultState = { mode: 'environment', initialised: true, unlocked: true }
  const demoMemory: { secrets: SecretSummary[] } = { secrets: sampleSecrets.map((secret) => ({ ...secret })) }

  const replaceSecret = (name: string, update: Partial<SecretSummary>): void => {
    demoMemory.secrets = demoMemory.secrets.map((secret) => (secret.name === name ? { ...secret, ...update } : secret))
  }

  return {
    readVault: async () => demoVaultState,
    setUpVault: async () => demoVaultState,
    unlockVault: async () => demoVaultState,
    lockVault: async () => demoVaultState,
    listSecrets: async () => demoMemory.secrets,
    saveSecret: async (name, value) =>
      replaceSecret(name, { isSet: true, lastFour: value.trim().slice(-4), updatedAt: new Date().toISOString() }),
    deleteSecret: async (name) => replaceSecret(name, { isSet: false, lastFour: null, updatedAt: null }),
    testSecret: async () => ({ ok: true, status: null, message: 'Demo mode: nothing was sent' }),
    listRepositories: async () => sampleRepositories,
    readBoard: async (repository) => ({ repository, columns: sampleBoardColumns, fetchedAt: new Date().toISOString() }),
  }
}
