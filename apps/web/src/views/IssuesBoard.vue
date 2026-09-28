<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardCardItem from '@/components/board/BoardCardItem.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { issueStatusLabels, parseRepositoryKey, repositoryKey } from '@/lib/presentation'
import { useBoardStore } from '@/stores/board'

const boardStore = useBoardStore()
const route = useRoute()
const router = useRouter()
const selectedRepositoryKey = ref<string>('')

const selectedRepository = computed(() => parseRepositoryKey(selectedRepositoryKey.value))

onMounted(async () => {
  await boardStore.loadRepositories()
  const requestedKey = typeof route.query.repository === 'string' ? route.query.repository : null
  const firstRepository = boardStore.repositories[0]
  selectedRepositoryKey.value = requestedKey ?? (firstRepository ? repositoryKey(firstRepository) : '')
})

watch(selectedRepositoryKey, async (nextKey) => {
  const repository = parseRepositoryKey(nextKey)
  if (repository === null) return
  await router.replace({ query: { repository: nextKey } })
  await boardStore.loadBoard(repository)
})

const refreshBoard = async (): Promise<void> => {
  if (selectedRepository.value) await boardStore.loadBoard(selectedRepository.value, true)
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <Select v-model="selectedRepositoryKey">
        <SelectTrigger class="w-64" aria-label="Repository">
          <SelectValue placeholder="Choose a repository" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="repository in boardStore.repositories"
            :key="repositoryKey(repository)"
            :value="repositoryKey(repository)"
          >
            {{ repositoryKey(repository) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" :disabled="boardStore.isLoading" @click="refreshBoard">
        <RefreshCw :class="{ 'animate-spin': boardStore.isLoading }" />
        Refresh
      </Button>
      <span v-if="boardStore.board" class="text-xs text-muted-foreground">
        Updated {{ new Date(boardStore.board.fetchedAt).toLocaleTimeString() }}
      </span>
    </div>

    <Alert v-if="boardStore.errorMessage" variant="destructive">
      <AlertTitle>The board could not be loaded</AlertTitle>
      <AlertDescription>
        {{ boardStore.errorMessage }}
        <RouterLink to="/credentials" class="underline">Open Credentials</RouterLink>
      </AlertDescription>
    </Alert>

    <div v-if="boardStore.isLoading && !boardStore.board" class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Skeleton v-for="placeholder in 6" :key="placeholder" class="h-40" />
    </div>

    <div v-else-if="boardStore.board" class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div v-for="column in boardStore.board.columns" :key="column.status" class="flex min-w-0 flex-col gap-2">
        <h2 class="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {{ issueStatusLabels[column.status] }}
          <Badge variant="secondary">{{ column.cards.length }}</Badge>
        </h2>
        <BoardCardItem
          v-for="card in column.cards"
          :key="card.issue ? `issue-${card.issue.number}` : `pull-${card.pullRequest?.number}`"
          :card="card"
        />
      </div>
    </div>
  </section>
</template>
