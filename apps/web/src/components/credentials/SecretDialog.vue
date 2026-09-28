<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { SecretSummary } from '@agent-dashboard/contracts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useVaultStore } from '@/stores/vault'

const props = defineProps<{ secret: SecretSummary; disabled: boolean }>()

const vaultStore = useVaultStore()
const isOpen = ref(false)
const secretValue = ref('')

const save = async (): Promise<void> => {
  try {
    await vaultStore.saveSecret(props.secret.name, secretValue.value)
    toast.success(`${props.secret.label} saved`)
    isOpen.value = false
  } catch (saveError) {
    toast.error(saveError instanceof Error ? saveError.message : 'The value could not be saved')
  } finally {
    secretValue.value = ''
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button size="sm" :variant="secret.isSet ? 'outline' : 'default'" :disabled="disabled">
        {{ secret.isSet ? 'Replace' : 'Add' }}
      </Button>
    </DialogTrigger>
    <DialogContent>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <DialogHeader>
          <DialogTitle>{{ secret.label }}</DialogTitle>
          <DialogDescription>
            {{ secret.description }} The value is encrypted on the server and never shown again.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-1.5">
          <Label :for="`secret-${secret.name}`">Value</Label>
          <Input :id="`secret-${secret.name}`" v-model="secretValue" type="password" autocomplete="off" spellcheck="false" />
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="secretValue.trim().length === 0">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
