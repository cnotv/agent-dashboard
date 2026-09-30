import { useEffect, useState } from 'react'
import type { RepositoryReference, StartOptions } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'
import { errorMessageOf } from '@/lib/presentation'
import { usePolledResource } from './usePolledResource'

const startsPollMilliseconds = 10_000

/**
 * Loads the sessions started from the board and refreshes them every ten seconds, so a start
 * waiting for the runner turns into a started one without a reload.
 * @returns The starts, newest first, and any error.
 */
export const useSessionStarts = () => usePolledResource('session-starts', () => dashboardApi.listSessionStarts(), startsPollMilliseconds)

/**
 * Loads where a session for this repository can run, while the Start dialog is open.
 * @param repository The repository.
 * @param isOpen Whether the dialog is open; nothing is read while it is closed.
 * @returns The options, or null until they arrive, and any error.
 */
export const useStartOptions = (repository: RepositoryReference, isOpen: boolean) => {
  const [result, setResult] = useState<{ options: StartOptions | null; errorMessage: string | null }>({ options: null, errorMessage: null })

  useEffect(() => {
    if (!isOpen) return
    const request = { isCurrent: true }
    dashboardApi
      .readStartOptions(repository)
      .then((options) => request.isCurrent && setResult({ options, errorMessage: null }))
      .catch((loadError: unknown) => request.isCurrent && setResult({ options: null, errorMessage: errorMessageOf(loadError) }))
    return () => {
      request.isCurrent = false
    }
  }, [repository, isOpen])

  return result
}
