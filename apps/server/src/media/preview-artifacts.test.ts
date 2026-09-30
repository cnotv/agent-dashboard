import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extractPreviewFiles, latestPreviewArtifactBySha } from './preview-artifacts.ts'

describe('latestPreviewArtifactBySha', () => {
  it('keeps the newest unexpired pr-preview artifact of each commit', () => {
    const artifactsBySha = latestPreviewArtifactBySha({
      artifacts: [
        { id: 3, name: 'pr-preview', expired: false, created_at: '2026-09-03T00:00:00Z', workflow_run: { head_sha: 'aaa1111' } },
        { id: 1, name: 'pr-preview', expired: false, created_at: '2026-09-01T00:00:00Z', workflow_run: { head_sha: 'aaa1111' } },
        { id: 4, name: 'pr-preview', expired: true, created_at: '2026-09-04T00:00:00Z', workflow_run: { head_sha: 'bbb2222' } },
        { id: 5, name: 'other', expired: false, created_at: '2026-09-05T00:00:00Z', workflow_run: { head_sha: 'ccc3333' } },
      ],
    })
    expect([...artifactsBySha.entries()]).toEqual([['aaa1111', 3]])
  })

  it('is empty for a response of the wrong shape', () => {
    expect(latestPreviewArtifactBySha({ message: 'Resource not accessible' }).size).toBe(0)
  })
})

describe('extractPreviewFiles', () => {
  it('takes only the screenshot and the video', () => {
    const zipBytes = zipSync({ 'screenshot.png': new Uint8Array([1]), 'notes.txt': new Uint8Array([2]) })
    expect(extractPreviewFiles(zipBytes)).toEqual({ image: new Uint8Array([1]), video: null })
  })
})
