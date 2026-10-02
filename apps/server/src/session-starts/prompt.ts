import type { SessionStart, StartAttachment } from '@dashi/contracts'

type StartSubject = Pick<SessionStart, 'repository' | 'issueNumber' | 'pullRequestNumber'>

// A start about a pull request, such as fixing its conflicts, points at the pull request; any
// other start points at its issue.
const subjectUrlOf = ({ repository, issueNumber, pullRequestNumber }: StartSubject): string | null => {
  const repositoryUrl = `https://github.com/${repository.owner}/${repository.name}`
  if (pullRequestNumber !== null) return `${repositoryUrl}/pull/${pullRequestNumber}`
  return issueNumber === null ? null : `${repositoryUrl}/issues/${issueNumber}`
}

const inlineAttachmentBlockOf = (attachment: StartAttachment): string =>
  `${attachment.name} (${attachment.mediaType}):\n\`\`\`base64\n${attachment.base64}\n\`\`\``

const inlineAttachmentsSectionOf = (attachments: StartAttachment[]): string | null =>
  attachments.length === 0
    ? null
    : [
        'Attachments, as base64. Decode each into a file outside the repository with `base64 -d` and read it:',
        ...attachments.map(inlineAttachmentBlockOf),
      ].join('\n\n')

/**
 * Writes the first message of a started session: the agent-base router with the workflow
 * already named, the address of its pull request or issue, the note from the Start dialog, and
 * the attachments of a session that only takes text.
 * @param start The start, as the dashboard stored it.
 * @param inlineAttachments Attachments to carry inside the prompt; a laptop session gets its own as files instead.
 * @returns The prompt.
 */
export const sessionPromptFor = (start: StartSubject & Pick<SessionStart, 'workflow' | 'note'>, inlineAttachments: StartAttachment[]): string => {
  const firstLine = [`/workflow:start ${start.workflow}`, subjectUrlOf(start)].filter((part) => part !== null).join(' ')
  return [firstLine, start.note.length === 0 ? null : start.note, inlineAttachmentsSectionOf(inlineAttachments)]
    .filter((part) => part !== null)
    .join('\n\n')
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
