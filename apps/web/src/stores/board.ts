import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Board, RepositoryReference } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'

export const useBoardStore = defineStore('board', () => {
  const repositories = ref<RepositoryReference[]>([])
  const board = ref<Board | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const loadRepositories = async (): Promise<void> => {
    repositories.value = await dashboardApi.listRepositories()
  }

  const loadBoard = async (repository: RepositoryReference, refresh = false): Promise<void> => {
    isLoading.value = true
    errorMessage.value = null
    try {
      board.value = await dashboardApi.readBoard(repository, refresh)
    } catch (loadError) {
      board.value = null
      errorMessage.value = loadError instanceof Error ? loadError.message : 'The board could not be loaded'
    } finally {
      isLoading.value = false
    }
  }

  return { repositories, board, isLoading, errorMessage, loadRepositories, loadBoard }
})
