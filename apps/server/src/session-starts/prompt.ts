import type { SessionStart } from '@agent-dashboard/contracts'

/**
 * Writes the first message of a started session: the agent-base router with the workflow
 * already named, the issue's address, and the note from the Start dialog.
 * @param start The start, as the dashboard stored it.
 * @returns The prompt.
 */
export const sessionPromptFor = (start: Pick<SessionStart, 'repository' | 'issueNumber' | 'workflow' | 'note'>): string => {
  const issueUrl =
    start.issueNumber === null ? null : `https://github.com/${start.repository.owner}/${start.repository.name}/issues/${start.issueNumber}`
  const firstLine = [`/workflow:start ${start.workflow}`, issueUrl].filter((part) => part !== null).join(' ')
  return start.note.length === 0 ? firstLine : `${firstLine}\n\n${start.note}`
}

/**
 * Names a started session after its repository, issue and workflow, as it shows in the Claude app.
 * @param start The start.
 * @returns The session name, such as generative-art #42 fix.
 */
export const sessionNameFor = (start: Pick<SessionStart, 'repository' | 'issueNumber' | 'workflow'>): string =>
  [start.repository.name, start.issueNumber === null ? null : `#${start.issueNumber}`, start.workflow]
    .filter((part) => part !== null)
    .join(' ')
