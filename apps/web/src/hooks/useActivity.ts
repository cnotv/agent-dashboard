import { useCallback, useEffect, useState } from 'react'
import type { CreatedMachineToken, MachineTokenKind, MachineTokenSummary } from '@dashi/contracts'
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
 * Loads one kind of machine token and creates or revokes them, reloading the list after each.
 * @param kind Ingest tokens report sessions; runner tokens claim sessions to start.
 * @param onError Called when the list cannot be read.
 * @returns The tokens and the create and revoke actions.
 */
export const useMachineTokens = (kind: MachineTokenKind, onError: (error: unknown) => void) => {
  const [machineTokens, setMachineTokens] = useState<MachineTokenSummary[]>([])

  const reload = useCallback(() => dashboardApi.listMachineTokens(kind).then(setMachineTokens), [kind])

  useEffect(() => {
    reload().catch(onError)
  }, [reload, onError])

  const createMachineToken = async (label: string): Promise<CreatedMachineToken> => {
    const createdToken = await dashboardApi.createMachineToken(kind, label)
    await reload()
    return createdToken
  }

  const revokeMachineToken = async (tokenId: string): Promise<void> => {
    await dashboardApi.revokeMachineToken(kind, tokenId)
    await reload()
  }

  return { machineTokens, createMachineToken, revokeMachineToken }
}
