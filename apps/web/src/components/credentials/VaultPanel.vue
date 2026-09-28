<script setup lang="ts">
import { Lock, LockOpen } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { VaultState } from '@agent-dashboard/contracts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useVaultStore } from '@/stores/vault'

defineProps<{ vaultState: VaultState }>()

const vaultStore = useVaultStore()
const passphrase = ref('')

const runWithToast = async (action: () => Promise<void>, successMessage: string): Promise<void> => {
  try {
    await action()
    passphrase.value = ''
    await vaultStore.refresh()
    toast.success(successMessage)
  } catch (actionError) {
    toast.error(actionError instanceof Error ? actionError.message : 'Something went wrong')
  }
}
</script>

<template>
  <Alert v-if="vaultState.mode === 'environment' && !vaultState.unlocked" variant="destructive">
    <Lock />
    <AlertTitle>The master key does not match</AlertTitle>
    <AlertDescription>
      The stored credentials were encrypted with a different AGENT_DASHBOARD_MASTER_KEY. Restart the dashboard with the
      original key.
    </AlertDescription>
  </Alert>

  <Alert v-else-if="vaultState.mode === 'environment'">
    <LockOpen />
    <AlertTitle>Unlocked by the master key</AlertTitle>
    <AlertDescription>Credentials are encrypted with the key from the environment.</AlertDescription>
  </Alert>

  <Alert v-else-if="vaultState.unlocked">
    <LockOpen />
    <AlertTitle>Unlocked until the next restart</AlertTitle>
    <AlertDescription class="flex flex-wrap items-center gap-2">
      The passphrase-derived key is held in memory only.
      <Button variant="outline" size="sm" @click="runWithToast(vaultStore.lock, 'Vault locked')">Lock now</Button>
    </AlertDescription>
  </Alert>

  <Alert v-else>
    <Lock />
    <AlertTitle>{{ vaultState.initialised ? 'The vault is locked' : 'Set a vault passphrase' }}</AlertTitle>
    <AlertDescription>
      <form
        class="mt-2 flex flex-wrap items-end gap-2"
        @submit.prevent="
          runWithToast(
            () => (vaultState.initialised ? vaultStore.unlock(passphrase) : vaultStore.setUp(passphrase)),
            vaultState.initialised ? 'Vault unlocked' : 'Vault created',
          )
        "
      >
        <div class="flex flex-col gap-1.5">
          <Label for="vault-passphrase">Passphrase</Label>
          <Input id="vault-passphrase" v-model="passphrase" type="password" autocomplete="current-password" class="w-72" />
        </div>
        <Button type="submit" :disabled="passphrase.length === 0">
          {{ vaultState.initialised ? 'Unlock' : 'Create vault' }}
        </Button>
      </form>
      <p v-if="!vaultState.initialised" class="mt-2 text-xs">
        At least 12 characters. It cannot be recovered: losing it means entering the credentials again.
      </p>
    </AlertDescription>
  </Alert>
</template>
