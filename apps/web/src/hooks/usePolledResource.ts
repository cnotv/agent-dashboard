import { useEffect, useEffectEvent, useState } from 'react'
import { errorMessageOf } from '@/lib/presentation'

interface PolledResult<Resource> {
  requestKey: string
  resource: Resource | null
  errorMessage: string | null
}

/**
 * Loads a resource, reloads it on an interval, and keeps the last good value while the next one loads.
 * Keeps the last good value while the next one loads, so a chart holds its frame on refetch
 * instead of flashing empty.
 * @param requestKey Changes whenever the request does, so an answer for an older request is marked stale.
 * @param loadResource Loads the resource.
 * @param pollMilliseconds How often to reload, or null to load once.
 * @returns The resource, any error, and whether it belongs to an older request.
 */
export const usePolledResource = <Resource>(
  requestKey: string,
  loadResource: () => Promise<Resource>,
  pollMilliseconds: number | null,
) => {
  const [result, setResult] = useState<PolledResult<Resource>>({ requestKey: '', resource: null, errorMessage: null })

  const readResource = useEffectEvent(loadResource)

  useEffect(() => {
    const request = { isCurrent: true }
    const load = (): void => {
      readResource()
        .then((resource) => request.isCurrent && setResult({ requestKey, resource, errorMessage: null }))
        .catch(
          (loadError: unknown) =>
            request.isCurrent && setResult((previous) => ({ ...previous, requestKey, errorMessage: errorMessageOf(loadError) })),
        )
    }
    load()
    const pollTimer = pollMilliseconds === null ? undefined : window.setInterval(load, pollMilliseconds)
    return () => {
      request.isCurrent = false
      window.clearInterval(pollTimer)
    }
  }, [requestKey, pollMilliseconds])

  return {
    resource: result.resource,
    errorMessage: result.errorMessage,
    isStale: result.requestKey !== requestKey,
  }
}
