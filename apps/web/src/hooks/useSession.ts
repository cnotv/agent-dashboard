import { useCallback, useEffect, useState } from 'react'
import type { SessionState } from '@dashi/contracts'
import { dashboardApi } from '@/lib/api'

/**
 * Loads who is signed in and offers sign-out.
 * @param onError Called when the session cannot be read.
 * @returns The session state, signOut and the sign-in address.
 */
export const useSession = (onError: (error: unknown) => void) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null)

  useEffect(() => {
    dashboardApi.readSession().then(setSessionState).catch(onError)
  }, [onError])

  const signOut = useCallback(async () => {
    await dashboardApi.signOut()
    setSessionState(await dashboardApi.readSession())
  }, [])

  return { sessionState, signOut, signInUrl: dashboardApi.signInUrl }
}
