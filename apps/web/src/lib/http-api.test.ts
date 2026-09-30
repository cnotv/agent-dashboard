import { describe, expect, it } from 'vitest'
import type { PullRequestSummary } from '@agent-dashboard/contracts'
import { createHttpApi } from './http-api'

describe('pullRequestMediaUrl', () => {
  it('names the head commit so the server can find its recording', () => {
    const httpApi = createHttpApi('https://agents.example.com')
    expect(httpApi.pullRequestMediaUrl({ owner: 'cnotv', name: 'agent-dashboard' }, { ...samplePullRequest, number: 7, headSha: 'fedc9876' }, 'video')).toBe(
      'https://agents.example.com/api/repositories/cnotv/agent-dashboard/pulls/7/media/video?sha=fedc9876',
    )
    expect(httpApi.pullRequestMediaUrl({ owner: 'cnotv', name: 'agent-dashboard' }, { ...samplePullRequest, number: 7, headSha: null }, 'image')).toBe(
      'https://agents.example.com/api/repositories/cnotv/agent-dashboard/pulls/7/media/image',
    )
  })
})

const samplePullRequest: PullRequestSummary = {
  number: 1,
  title: 'feat: thing',
  url: 'https://github.com/cnotv/agent-dashboard/pull/1',
  isDraft: false,
  headRefName: 'feat/1-thing',
  headSha: null,
  reviewDecision: null,
  mergeable: 'MERGEABLE',
  body: '',
  updatedAt: '2026-09-30T00:00:00Z',
  gates: [],
  gateSummary: { passed: 0, failed: 0, pending: 0, total: 0, overallState: 'none' },
  media: { hasImage: true, hasVideo: true },
}
