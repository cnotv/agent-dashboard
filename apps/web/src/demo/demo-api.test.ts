import { describe, expect, it } from 'vitest'
import { createDemoApi } from './demo-api'

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

  it('starts fresh for every instance', async () => {
    const firstApi = createDemoApi()
    await firstApi.deleteSecret('github-token')
    const secondApi = createDemoApi()
    expect((await secondApi.listSecrets()).find((secret) => secret.name === 'github-token')?.isSet).toBe(true)
  })
})
