import { describe, expect, it } from 'vitest'
import { deployPreviewUrlFromGates } from './deploy-preview.ts'

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
