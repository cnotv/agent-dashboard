import { describe, expect, it } from 'vitest'
import { issueBodyFor, issueTitleFrom } from './new-issue'

describe('issueTitleFrom', () => {
  it('takes the first line that has text, without heading marks', () => {
    expect(issueTitleFrom('\n## Show the frame time\nTop right, small.')).toBe('Show the frame time')
    expect(issueTitleFrom('   \n')).toBe('')
  })

  it('shortens a long first line at a word', () => {
    const longLine = 'The marbles stop halfway down the ramp whenever the camera follows them through the second loop'
    const title = issueTitleFrom(longLine)
    expect(title.length).toBeLessThanOrEqual(80)
    expect(title).toBe('The marbles stop halfway down the ramp whenever the camera follows them…')
  })
})

describe('issueBodyFor', () => {
  it('names the attachments under the text', () => {
    expect(issueBodyFor('It sticks.', ['ramp.png'])).toBe('It sticks.\n\nAttachments sent to the session: ramp.png')
    expect(issueBodyFor('It sticks.', [])).toBe('It sticks.')
    expect(issueBodyFor('', ['ramp.png'])).toBe('Attachments sent to the session: ramp.png')
  })
})
