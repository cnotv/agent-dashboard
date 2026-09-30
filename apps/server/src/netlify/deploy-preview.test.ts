import { describe, expect, it } from 'vitest'
import { deployPreviewUrlFromGates, previewPageUrl, previewRouteFromBody } from './deploy-preview.ts'

describe('deployPreviewUrlFromGates', () => {
  it('returns the preview once Netlify reports it ready', () => {
    const previewUrl = 'https://deploy-preview-20--cnotv-agent-dashboard.netlify.app'
    expect(
      deployPreviewUrlFromGates([
        { name: 'lint', state: 'success', url: 'https://github.com/cnotv/agent-dashboard/runs/1' },
        { name: 'deploy/netlify', state: 'success', url: previewUrl },
      ]),
    ).toBe(previewUrl)
  })

  it('ignores the build log while the preview builds, and any other host', () => {
    expect(deployPreviewUrlFromGates([{ name: 'deploy/netlify', state: 'pending', url: 'https://app.netlify.com/sites/x/deploys/1' }])).toBeNull()
    expect(deployPreviewUrlFromGates([{ name: 'deploy/netlify', state: 'success', url: 'https://app.netlify.com/sites/x' }])).toBeNull()
    expect(deployPreviewUrlFromGates([{ name: 'x', state: 'success', url: 'http://deploy-preview-1--x.netlify.app' }])).toBeNull()
    expect(deployPreviewUrlFromGates([{ name: 'x', state: 'success', url: 'https://evil.example/?.netlify.app' }])).toBeNull()
  })
})

describe('previewRouteFromBody', () => {
  it('reads the Preview route line, with or without backticks', () => {
    expect(previewRouteFromBody('Closes #4\n\nPreview route: /games/Minigolf\n')).toBe('/games/Minigolf')
    expect(previewRouteFromBody('preview route: `/a?b=1#c`')).toBe('/a?b=1#c')
  })

  it('returns null without a line, or for a route that could leave the preview', () => {
    expect(previewRouteFromBody('Closes #4')).toBeNull()
    expect(previewRouteFromBody('Preview route: https://evil.example')).toBeNull()
    expect(previewRouteFromBody('Preview route: //evil.example/x')).toBeNull()
    expect(previewRouteFromBody('Preview route: /a/../../etc')).toBeNull()
    expect(previewRouteFromBody('Preview route: /a;rm')).toBeNull()
  })
})

describe('previewPageUrl', () => {
  const previewUrl = 'https://deploy-preview-30--cnotv-example.netlify.app'

  it('opens the page the pull request names', () => {
    expect(previewPageUrl(previewUrl, 'Preview route: /games/MarbleMadness')).toBe(`${previewUrl}/games/MarbleMadness`)
    expect(previewPageUrl(`${previewUrl}/`, 'Preview route: /x')).toBe(`${previewUrl}/x`)
  })

  it('keeps the root without a route, and stays null without a preview', () => {
    expect(previewPageUrl(previewUrl, 'Closes #7')).toBe(previewUrl)
    expect(previewPageUrl(null, 'Preview route: /x')).toBeNull()
  })
})
