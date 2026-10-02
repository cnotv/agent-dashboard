import type { SessionStart } from '@dashi/contracts'

type StartSubject = Pick<SessionStart, 'repository' | 'issueNumber' | 'pullRequestNumber'>

// A start about a pull request, such as fixing its conflicts, points at the pull request; any
// other start points at its issue.
const subjectUrlOf = ({ repository, issueNumber, pullRequestNumber }: StartSubject): string | null => {
  const repositoryUrl = `https://github.com/${repository.owner}/${repository.name}`
  if (pullRequestNumber !== null) return `${repositoryUrl}/pull/${pullRequestNumber}`
  return issueNumber === null ? null : `${repositoryUrl}/issues/${issueNumber}`
}

/**
 * Writes the first message of a started session: the agent-base router with the workflow
 * already named, the address of its pull request or issue, and the note from the Start dialog.
 * @param start The start, as the dashboard stored it.
 * @returns The prompt.
 */
export const sessionPromptFor = (start: StartSubject & Pick<SessionStart, 'workflow' | 'note'>): string => {
  const firstLine = [`/workflow:start ${start.workflow}`, subjectUrlOf(start)].filter((part) => part !== null).join(' ')
  return start.note.length === 0 ? firstLine : `${firstLine}\n\n${start.note}`
}

/**
 * Names a started session after its repository, pull request or issue, and workflow, as it shows in the Claude app.
 * @param start The start.
 * @returns The session name, such as generative-art #42 fix.
 */
export const sessionNameFor = (start: StartSubject & Pick<SessionStart, 'workflow'>): string => {
  const subjectNumber = start.pullRequestNumber ?? start.issueNumber
  return [start.repository.name, subjectNumber === null ? null : `#${subjectNumber}`, start.workflow]
    .filter((part) => part !== null)
    .join(' ')
}
