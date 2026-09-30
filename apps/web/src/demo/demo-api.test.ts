import { describe, expect, it } from 'vitest'
import { createDemoApi } from './demo-api'
import { sampleBoardColumns } from './sample-board'

describe('createDemoApi', () => {
  it('serves a board for whichever repository is asked for', async () => {
    const demoApi = createDemoApi()
    const [firstRepository] = await demoApi.listRepositories()
    const board = await demoApi.readBoard(firstRepository!, false)
    expect(board.repository).toEqual(firstRepository)
    expect(board.columns.flatMap((column) => column.cards).length).toBeGreaterThan(0)
  })

  it('keeps saved values in memory and shows only the last four characters', async () => {
    const demoApi = createDemoApi()
    await demoApi.saveSecret('openrouter-api-key', 'sk-or-example-9876')
    const savedSecret = (await demoApi.listSecrets()).find((secret) => secret.name === 'openrouter-api-key')
    expect(savedSecret).toMatchObject({ isSet: true, lastFour: '9876' })
    expect(JSON.stringify(await demoApi.listSecrets())).not.toContain('sk-or-example-9876')
    await demoApi.deleteSecret('openrouter-api-key')
    expect((await demoApi.listSecrets()).find((secret) => secret.name === 'openrouter-api-key')?.isSet).toBe(false)
  })

  it('is signed in as a demo user with no GitHub sign-in to offer', async () => {
    expect(await createDemoApi().readSession()).toEqual({
      signInRequired: false,
      signInAvailable: false,
      user: { login: 'demo', avatarUrl: '' },
    })
  })

  it('starts fresh for every instance', async () => {
    const firstApi = createDemoApi()
    await firstApi.deleteSecret('github-token')
    const secondApi = createDemoApi()
    expect((await secondApi.listSecrets()).find((secret) => secret.name === 'github-token')?.isSet).toBe(true)
  })

  it('shows running sessions inside the window it was asked for', async () => {
    const overview = await createDemoApi().readSessions(24)
    expect(overview.sessions.some((session) => session.state === 'working')).toBe(true)
    expect(overview.timeline.every((segment) => segment.startedAt >= overview.windowStartedAt)).toBe(true)
  })

  it('adds up usage so the parts match the total', async () => {
    const report = await createDemoApi().readUsage(30)
    const dailyTotal = report.byDay.reduce((sum, usage) => sum + usage.tokens.total, 0)
    expect(dailyTotal).toBe(report.totals.total)
  })

  it('creates and revokes ingest tokens in memory', async () => {
    const demoApi = createDemoApi()
    const createdToken = await demoApi.createIngestToken('Desk')
    expect((await demoApi.listIngestTokens()).map((ingestToken) => ingestToken.label)).toContain('Desk')
    await demoApi.revokeIngestToken(createdToken.summary.tokenId)
    expect((await demoApi.listIngestTokens()).map((ingestToken) => ingestToken.label)).not.toContain('Desk')
  })

  it('points media at the bundled demo recording', () => {
    const demoApi = createDemoApi()
    const [pullRequest] = sampleBoardColumns.flatMap((column) => column.cards).flatMap((card) => (card.pullRequest ? [card.pullRequest] : []))
    expect(demoApi.pullRequestMediaUrl({ owner: 'cnotv', name: 'example' }, pullRequest!, 'video')).toBe('/demo-media/video.webm')
  })
})
