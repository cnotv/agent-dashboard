// GitHub shows titles in one line; past this the board card wraps into a paragraph.
const maximumTitleLength = 80

/**
 * Makes the issue title from the message: its first line, without Markdown heading marks,
 * shortened at a word when it runs long.
 * @param message The message typed in the New issue chat.
 * @returns The title, or an empty text when the message is empty.
 */
export const issueTitleFrom = (message: string): string => {
  const firstLine = message
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line !== '')
  if (firstLine === undefined) return ''
  if (firstLine.length <= maximumTitleLength) return firstLine
  const shortened = firstLine.slice(0, maximumTitleLength - 1)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${(lastSpace > maximumTitleLength / 2 ? shortened.slice(0, lastSpace) : shortened).trimEnd()}…`
}

/**
 * Writes the issue body: the text, and the names of the files that went to the session only.
 * @param text The text typed in the dialog.
 * @param attachmentNames The attachments' names.
 * @returns The body.
 */
export const issueBodyFor = (text: string, attachmentNames: string[]): string =>
  attachmentNames.length === 0 ? text : [text, `Attachments sent to the session: ${attachmentNames.join(', ')}`].filter((part) => part !== '').join('\n\n')
