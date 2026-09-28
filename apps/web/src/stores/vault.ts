import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SecretSummary, VaultState } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'

export const useVaultStore = defineStore('vault', () => {
  const vaultState = ref<VaultState | null>(null)
  const secrets = ref<SecretSummary[]>([])

  const refresh = async (): Promise<void> => {
    const [nextVaultState, nextSecrets] = await Promise.all([dashboardApi.readVault(), dashboardApi.listSecrets()])
    vaultState.value = nextVaultState
    secrets.value = nextSecrets
  }

  const setUp = async (passphrase: string): Promise<void> => {
    vaultState.value = await dashboardApi.setUpVault(passphrase)
  }

  const unlock = async (passphrase: string): Promise<void> => {
    vaultState.value = await dashboardApi.unlockVault(passphrase)
  }

  const lock = async (): Promise<void> => {
    vaultState.value = await dashboardApi.lockVault()
  }

  const saveSecret = async (name: string, value: string): Promise<void> => {
    await dashboardApi.saveSecret(name, value)
    await refresh()
  }

  const deleteSecret = async (name: string): Promise<void> => {
    await dashboardApi.deleteSecret(name)
    await refresh()
  }

  return { vaultState, secrets, refresh, setUp, unlock, lock, saveSecret, deleteSecret, testSecret: dashboardApi.testSecret }
})
