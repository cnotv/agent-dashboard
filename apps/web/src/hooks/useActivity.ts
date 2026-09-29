import { useCallback, useEffect, useState } from 'react'
import type { CreatedIngestToken, IngestTokenSummary } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'
import { usePolledResource } from './usePolledResource'

const sessionsPollMilliseconds = 15_000
const usagePollMilliseconds = 60_000

export const useSessionsOverview = (hours: number) =>
  usePolledResource(`sessions-${hours}`, () => dashboardApi.readSessions(hours), sessionsPollMilliseconds)

export const useUsageReport = (days: number) =>
  usePolledResource(`usage-${days}`, () => dashboardApi.readUsage(days), usagePollMilliseconds)

export const useIngestTokens = (onError: (error: unknown) => void) => {
  const [ingestTokens, setIngestTokens] = useState<IngestTokenSummary[]>([])

  const reload = useCallback(() => dashboardApi.listIngestTokens().then(setIngestTokens), [])

  useEffect(() => {
    reload().catch(onError)
  }, [reload, onError])

  const createIngestToken = async (label: string): Promise<CreatedIngestToken> => {
    const createdToken = await dashboardApi.createIngestToken(label)
    await reload()
    return createdToken
  }

  const revokeIngestToken = async (tokenId: string): Promise<void> => {
    await dashboardApi.revokeIngestToken(tokenId)
    await reload()
  }

  return { ingestTokens, createIngestToken, revokeIngestToken }
}
