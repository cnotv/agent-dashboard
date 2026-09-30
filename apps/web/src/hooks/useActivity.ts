import { useCallback, useEffect, useState } from 'react'
import type { CreatedIngestToken, IngestTokenSummary } from '@agent-dashboard/contracts'
import { dashboardApi } from '@/lib/api'
import { usePolledResource } from './usePolledResource'

const sessionsPollMilliseconds = 15_000
const usagePollMilliseconds = 60_000

/**
 * Loads the Sessions page and refreshes it every 15 seconds.
 * @param hours The window to show.
 * @returns The overview, any error, and whether it is from an earlier window.
 */
export const useSessionsOverview = (hours: number) =>
  usePolledResource(`sessions-${hours}`, () => dashboardApi.readSessions(hours), sessionsPollMilliseconds)

/**
 * Loads the Usage page and refreshes it every minute.
 * @param days The period to show.
 * @returns The report, any error, and whether it is from an earlier period.
 */
export const useUsageReport = (days: number) =>
  usePolledResource(`usage-${days}`, () => dashboardApi.readUsage(days), usagePollMilliseconds)

/**
 * Loads the ingest tokens and creates or revokes them, reloading the list after each.
 * @param onError Called when the list cannot be read.
 * @returns The tokens and the create and revoke actions.
 */
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
