import { describe, expect, it } from 'vitest'
import { attachmentNameFor, issueBodyFor, mediaTypeFor } from './attachments'

describe('attachmentNameFor', () => {
  it('keeps a plain name as it is', () => {
    expect(attachmentNameFor('screenshot.png', [])).toBe('screenshot.png')
  })

  it('reduces a name to the characters the dashboard accepts', () => {
    expect(attachmentNameFor('../../Schermata 2026 (1).png', [])).toBe('Schermata 2026 -1-.png')
    expect(attachmentNameFor('???', [])).toBe('attachment')
  })

  it('adds a number before the extension when the name is taken', () => {
    expect(attachmentNameFor('image.png', ['image.png'])).toBe('image-2.png')
    expect(attachmentNameFor('image.png', ['image.png', 'image-2.png'])).toBe('image-3.png')
  })
})

describe('mediaTypeFor', () => {
  it('falls back to plain bytes for an empty or odd type', () => {
    expect(mediaTypeFor('image/svg+xml')).toBe('image/svg+xml')
    expect(mediaTypeFor('')).toBe('application/octet-stream')
  })
})

describe('issueBodyFor', () => {
  it('names the attachments under the text', () => {
    expect(issueBodyFor('It sticks.', ['ramp.png'])).toBe('It sticks.\n\nAttachments sent to the session: ramp.png')
    expect(issueBodyFor('It sticks.', [])).toBe('It sticks.')
    expect(issueBodyFor('', ['ramp.png'])).toBe('Attachments sent to the session: ramp.png')
  })
})
