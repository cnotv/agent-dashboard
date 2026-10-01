import { useState } from 'react'
import type { IssueStatus } from '@agent-dashboard/contracts'
import { parseCollapsedStatuses, toggleCollapsedStatus } from '@/lib/board-columns'

const storageKey = 'dashi.board.collapsed-columns'

// Storage can be blocked, as in a private window, so a failed read or write leaves the defaults.
const readStoredValue = (): string | null => {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

const writeStoredValue = (collapsedStatuses: IssueStatus[]): void => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(collapsedStatuses))
  } catch {
    // The choice still holds for this visit; it is only not remembered.
  }
}

/**
 * Which board columns are folded, remembered in this browser.
 * @returns The folded statuses and a toggle for one column.
 */
export const useCollapsedColumns = () => {
  const [collapsedStatuses, setCollapsedStatuses] = useState<IssueStatus[]>(() => parseCollapsedStatuses(readStoredValue()))

  const toggleColumn = (status: IssueStatus): void => {
    const nextStatuses = toggleCollapsedStatus(collapsedStatuses, status)
    setCollapsedStatuses(nextStatuses)
    writeStoredValue(nextStatuses)
  }

  return { collapsedStatuses, toggleColumn }
}
