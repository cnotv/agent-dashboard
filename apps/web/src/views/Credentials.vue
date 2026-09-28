<script setup lang="ts">
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import SecretDialog from '@/components/credentials/SecretDialog.vue'
import VaultPanel from '@/components/credentials/VaultPanel.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useVaultStore } from '@/stores/vault'

const vaultStore = useVaultStore()

onMounted(() => vaultStore.refresh())

const testSecret = async (name: string, label: string): Promise<void> => {
  try {
    const testResult = await vaultStore.testSecret(name)
    if (testResult.ok) toast.success(`${label}: ${testResult.message}`)
    else toast.error(`${label}: ${testResult.message}${testResult.status ? ` (${testResult.status})` : ''}`)
  } catch (testError) {
    toast.error(testError instanceof Error ? testError.message : 'The test failed')
  }
}

const deleteSecret = async (name: string, label: string): Promise<void> => {
  try {
    await vaultStore.deleteSecret(name)
    toast.success(`${label} removed`)
  } catch (deleteError) {
    toast.error(deleteError instanceof Error ? deleteError.message : 'The value could not be removed')
  }
}
</script>

<template>
  <section class="flex max-w-4xl flex-col gap-4">
    <VaultPanel v-if="vaultStore.vaultState" :vault-state="vaultStore.vaultState" />

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Credential</TableHead>
          <TableHead>Stored</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="secret in vaultStore.secrets" :key="secret.name">
          <TableCell>
            <div class="font-medium">{{ secret.label }}</div>
            <div class="text-xs whitespace-normal text-muted-foreground">{{ secret.description }}</div>
          </TableCell>
          <TableCell>
            <Badge v-if="secret.isSet" variant="secondary" class="font-mono">••••{{ secret.lastFour }}</Badge>
            <Badge v-else variant="outline">Not set</Badge>
          </TableCell>
          <TableCell class="text-right whitespace-normal">
            <div class="flex flex-wrap justify-end gap-2">
              <SecretDialog :secret="secret" :disabled="!vaultStore.vaultState?.unlocked" />
              <Button
                size="sm"
                variant="outline"
                :disabled="!secret.isSet || !vaultStore.vaultState?.unlocked"
                @click="testSecret(secret.name, secret.label)"
              >
                Test
              </Button>
              <Button size="sm" variant="ghost" :disabled="!secret.isSet" @click="deleteSecret(secret.name, secret.label)">
                Remove
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </section>
</template>
