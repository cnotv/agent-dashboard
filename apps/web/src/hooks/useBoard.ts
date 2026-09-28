import { useEffect, useRef, useState } from 'react'
import type { Board, RepositoryReference } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'
import { errorMessageOf, repositoryKey } from '@/lib/presentation'

export const useRepositories = () => {
  const [repositories, setRepositories] = useState<RepositoryReference[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    dashboardApi
      .listRepositories()
      .then(setRepositories)
      .catch((loadError: unknown) => setErrorMessage(errorMessageOf(loadError)))
  }, [])

  return { repositories, errorMessage }
}

interface BoardResult {
  requestKey: string | null
  board: Board | null
  errorMessage: string | null
}

export const useBoard = (repository: RepositoryReference | null) => {
  const requestKey = repository === null ? null : repositoryKey(repository)
  const [result, setResult] = useState<BoardResult>({ requestKey: null, board: null, errorMessage: null })
  const [refreshCount, setRefreshCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Set by the Refresh button and consumed by the next load, so switching repositories after
  // a refresh does not keep bypassing the server's cache.
  const bypassCacheRef = useRef(false)

  useEffect(() => {
    if (repository === null) return
    const request = { isCurrent: true }
    const bypassCache = bypassCacheRef.current
    bypassCacheRef.current = false
    dashboardApi
      .readBoard(repository, bypassCache)
      .then((board) => request.isCurrent && setResult({ requestKey: repositoryKey(repository), board, errorMessage: null }))
      .catch(
        (loadError: unknown) =>
          request.isCurrent &&
          setResult({ requestKey: repositoryKey(repository), board: null, errorMessage: errorMessageOf(loadError) }),
      )
      .finally(() => request.isCurrent && setIsRefreshing(false))
    return () => {
      request.isCurrent = false
    }
  }, [repository, refreshCount])

  const refresh = (): void => {
    bypassCacheRef.current = true
    setIsRefreshing(true)
    setRefreshCount((count) => count + 1)
  }

  const isCurrentResult = result.requestKey === requestKey
  return {
    board: isCurrentResult ? result.board : null,
    errorMessage: isCurrentResult ? result.errorMessage : null,
    isLoading: requestKey !== null && (!isCurrentResult || isRefreshing),
    refresh,
  }
}
