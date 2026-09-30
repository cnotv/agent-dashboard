import { useEffect, useState } from 'react'
import type { NetlifyStatus, RepositoryReference } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'
import { errorMessageOf, repositoryKey } from '@/lib/presentation'

interface NetlifyStatusResult {
  requestKey: string | null
  status: NetlifyStatus | null
  errorMessage: string | null
}

/**
 * Loads whether Netlify builds the selected repository, and creates the site on request.
 * @param repository The selected repository, or null before one is known.
 * @returns The status, any load error, and enable, which throws Netlify's refusal for a toast.
 */
export const useNetlifyStatus = (repository: RepositoryReference | null) => {
  const requestKey = repository === null ? null : repositoryKey(repository)
  const [result, setResult] = useState<NetlifyStatusResult>({ requestKey: null, status: null, errorMessage: null })

  useEffect(() => {
    if (repository === null) return
    const request = { isCurrent: true }
    dashboardApi
      .readNetlifyStatus(repository)
      .then((status) => request.isCurrent && setResult({ requestKey: repositoryKey(repository), status, errorMessage: null }))
      .catch(
        (loadError: unknown) =>
          request.isCurrent && setResult({ requestKey: repositoryKey(repository), status: null, errorMessage: errorMessageOf(loadError) }),
      )
    return () => {
      request.isCurrent = false
    }
  }, [repository])

  const enable = async (): Promise<void> => {
    if (repository === null) return
    const status = await dashboardApi.enableNetlify(repository)
    setResult({ requestKey: repositoryKey(repository), status, errorMessage: null })
  }

  const isCurrentResult = result.requestKey === requestKey
  return {
    status: isCurrentResult ? result.status : null,
    errorMessage: isCurrentResult ? result.errorMessage : null,
    enable,
  }
}
