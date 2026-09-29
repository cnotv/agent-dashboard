import { useCallback, useEffect, useState } from 'react'
import type { SessionState } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'

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
