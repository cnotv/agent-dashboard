import { describe, expect, it } from 'vitest'
import { mediaPresenceFromMarkdown, mediaUrlFromBodyHtml } from './media.ts'

describe('mediaPresenceFromMarkdown', () => {
  it('finds a markdown screenshot and a bare user-attachments video', () => {
    const body = [
      'Closes #4',
      '',
      '![screenshot](https://github.com/user-attachments/assets/1b2c3d4e-aaaa-bbbb-cccc-000000000001)',
      '',
      'https://github.com/user-attachments/assets/1b2c3d4e-aaaa-bbbb-cccc-000000000002',
    ].join('\n')
    expect(mediaPresenceFromMarkdown(body)).toEqual({ hasImage: true, hasVideo: true })
  })

  it('reads img and video tags', () => {
    expect(mediaPresenceFromMarkdown('<img width="600" src="https://example.com/a.png">')).toEqual({ hasImage: true, hasVideo: false })
    expect(mediaPresenceFromMarkdown('<video src="https://example.com/a.webm" controls></video>')).toEqual({
      hasImage: false,
      hasVideo: true,
    })
  })

  it('does not take a link inside a sentence for a video', () => {
    expect(mediaPresenceFromMarkdown('See https://github.com/user-attachments/assets/abc for the log')).toEqual({
      hasImage: false,
      hasVideo: false,
    })
  })
})

describe('mediaUrlFromBodyHtml', () => {
  const signedImage = 'https://private-user-images.githubusercontent.com/1/image.png?jwt=header.payload&amp;x=1'
  const signedVideo = 'https://private-user-images.githubusercontent.com/1/video.mp4?jwt=header.payload'
  const bodyHtml = [
    '<p>Closes <a href="https://github.com/o/r/issues/4">#4</a></p>',
    '<img class="emoji" src="https://github.githubassets.com/images/icons/emoji/unicode/1f680.png">',
    `<p><a href="${signedImage}"><img src="${signedImage}" alt="screenshot" style="max-width: 100%;"></a></p>`,
    `<video src="${signedVideo}" data-canonical-src="https://github.com/user-attachments/assets/2" controls="controls" muted="muted"></video>`,
  ].join('\n')

  it('returns the signed link for each kind, skipping emoji', () => {
    expect(mediaUrlFromBodyHtml(bodyHtml, 'image')).toBe(
      'https://private-user-images.githubusercontent.com/1/image.png?jwt=header.payload&x=1',
    )
    expect(mediaUrlFromBodyHtml(bodyHtml, 'video')).toBe(signedVideo)
  })

  it('never returns a link outside GitHub', () => {
    expect(mediaUrlFromBodyHtml('<img src="https://tracker.example.com/pixel.png">', 'image')).toBeNull()
    expect(mediaUrlFromBodyHtml('<video src="http://github.com/a.mp4"></video>', 'video')).toBeNull()
    expect(mediaUrlFromBodyHtml('<img src="https://github.com.example.com/a.png">', 'image')).toBeNull()
  })

  it('is null when the body has none', () => {
    expect(mediaUrlFromBodyHtml('<p>No media</p>', 'video')).toBeNull()
  })
})
