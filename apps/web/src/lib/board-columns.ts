import type { IssueStatus } from '@agent-dashboard/contracts'
import { issueStatusLabels } from './presentation'

// The columns most boards fill with work nobody is on yet, or work already done, start folded.
export const defaultCollapsedStatuses: IssueStatus[] = ['no-pull-request', 'closed']

const isIssueStatus = (value: unknown): value is IssueStatus => typeof value === 'string' && Object.hasOwn(issueStatusLabels, value)

/**
 * Reads the folded columns this browser remembers, falling back to the defaults when nothing
 * readable is stored.
 * @param storedValue What browser storage holds, or null.
 * @returns The statuses of the folded columns.
 */
export const parseCollapsedStatuses = (storedValue: string | null): IssueStatus[] => {
  if (storedValue === null) return defaultCollapsedStatuses
  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    return Array.isArray(parsedValue) ? parsedValue.filter(isIssueStatus) : defaultCollapsedStatuses
  } catch {
    return defaultCollapsedStatuses
  }
}

/**
 * Folds an unfolded column, or unfolds a folded one.
 * @param collapsedStatuses The folded columns.
 * @param status The column to toggle.
 * @returns The folded columns after the toggle.
 */
export const toggleCollapsedStatus = (collapsedStatuses: IssueStatus[], status: IssueStatus): IssueStatus[] =>
  collapsedStatuses.includes(status)
    ? collapsedStatuses.filter((collapsedStatus) => collapsedStatus !== status)
    : [...collapsedStatuses, status]
