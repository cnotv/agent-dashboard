import { useEffect, useRef, useState } from 'react'
import type { Board, RepositoryReference } from '@dashi/contracts'
import { dashboardApi } from '@/lib/api'
import { errorMessageOf, parseRepositoryKey, repositoryKey } from '@/lib/presentation'

/**
 * Loads the configured repositories once.
 * @returns The repositories and any load error.
 */
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

interface BoardsResult {
  requestKey: string | null
  boards: Board[]
  errorMessage: string | null
}

/**
 * Loads the boards of one or more repositories side by side and reloads them on demand,
 * ignoring answers for a selection no longer shown. A repository that fails to load leaves
 * the others on screen, with its error alongside.
 * @param repositories The repositories to show, empty before they are known.
 * @returns The boards that loaded, the first error, whether they are loading, and refresh.
 */
export const useBoards = (repositories: RepositoryReference[]) => {
  const requestKey = repositories.length === 0 ? null : repositories.map(repositoryKey).join(',')
  const [result, setResult] = useState<BoardsResult>({
    requestKey: null,
    boards: [],
    errorMessage: null,
  })
  const [refreshCount, setRefreshCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Set by the Refresh button and consumed by the next load, so switching repositories after
  // a refresh does not keep bypassing the server's cache.
  const bypassCacheRef = useRef(false)

  useEffect(() => {
    if (requestKey === null) return
    const request = { isCurrent: true }
    const bypassCache = bypassCacheRef.current
    bypassCacheRef.current = false
    const requestedRepositories = requestKey.split(',').flatMap((key) => parseRepositoryKey(key) ?? [])
    Promise.allSettled(requestedRepositories.map((repository) => dashboardApi.readBoard(repository, bypassCache)))
      .then((outcomes) => {
        if (!request.isCurrent) return
        const boards = outcomes.flatMap((outcome) => (outcome.status === 'fulfilled' ? [outcome.value] : []))
        const firstFailure = outcomes.find((outcome) => outcome.status === 'rejected')
        setResult({
          requestKey,
          boards,
          errorMessage: firstFailure ? errorMessageOf(firstFailure.reason) : null,
        })
      })
      .finally(() => request.isCurrent && setIsRefreshing(false))
    return () => {
      request.isCurrent = false
    }
  }, [requestKey, refreshCount])

  const refresh = (): void => {
    bypassCacheRef.current = true
    setIsRefreshing(true)
    setRefreshCount((count) => count + 1)
  }

  const isCurrentResult = result.requestKey === requestKey
  return {
    boards: isCurrentResult ? result.boards : [],
    errorMessage: isCurrentResult ? result.errorMessage : null,
    isLoading: requestKey !== null && (!isCurrentResult || isRefreshing),
    refresh,
  }
}
