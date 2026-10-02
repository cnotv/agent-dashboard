import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestApp, getRequest, jsonRequest } from '../app/test-app.ts'
import { sessionNameFor, sessionPromptFor } from './prompt.ts'

const repository = { owner: 'cnotv', name: 'generative-art' }
const startBody = (overrides: Record<string, unknown> = {}) => ({
  repository,
  issueNumber: 42,
  workflow: 'fix',
  target: 'laptop-remote-control',
  permissionMode: 'auto',
  note: '',
  ...overrides,
})
const routineToken = 'sk-ant-oat01-exampleRoutineToken0123456789'

const startIdOf = async (response: Response): Promise<string> => z.object({ startId: z.string() }).parse(await response.json()).startId

const runnerRequest = (path: string, token: string, body: unknown = {}) =>
  jsonRequest('POST', `/api/runner${path}`, body, { authorization: `Bearer ${token}` })

describe('sessionPromptFor', () => {
  it('names the workflow for the router, links the issue and adds the note', () => {
    expect(sessionPromptFor({ repository, issueNumber: 42, pullRequestNumber: null, workflow: 'fix', note: 'Only the physics.' }, [])).toBe(
      '/workflow:start fix https://github.com/cnotv/generative-art/issues/42\n\nOnly the physics.',
    )
    expect(sessionPromptFor({ repository, issueNumber: null, pullRequestNumber: null, workflow: 'research', note: '' }, [])).toBe(
      '/workflow:start research',
    )
    expect(sessionNameFor({ repository, issueNumber: 42, pullRequestNumber: null, workflow: 'fix' })).toBe('generative-art #42 fix')
  })

  it('points a conflicts start at its pull request', () => {
    const conflictsStart = { repository, issueNumber: 42, pullRequestNumber: 43, workflow: 'conflicts' as const, note: '' }
    expect(sessionPromptFor(conflictsStart, [])).toBe('/workflow:start conflicts https://github.com/cnotv/generative-art/pull/43')
    expect(sessionNameFor(conflictsStart)).toBe('generative-art #43 conflicts')
  })
})

describe('attachments', () => {
  const screenshot = { name: 'ramp.png', mediaType: 'image/png', base64: Buffer.from('not really a png').toString('base64') }

  it('carries the attachments of a session that only takes text inside its prompt', () => {
    const prompt = sessionPromptFor({ repository, issueNumber: 42, pullRequestNumber: null, workflow: 'fix', note: 'See the image.' }, [screenshot])
    expect(prompt).toBe(
      [
        '/workflow:start fix https://github.com/cnotv/generative-art/issues/42',
        'See the image.',
        'Attachments, as base64. Decode each into a file outside the repository with `base64 -d` and read it:',
        `ramp.png (image/png):\n\`\`\`base64\n${screenshot.base64}\n\`\`\``,
      ].join('\n\n'),
    )
  })

  it('hands a laptop start its files once, with the claim, and never stores them', async () => {
    const { app, runnerTokens, database } = createTestApp()
    const { token } = runnerTokens.createToken('Mac mini')
    const queuedResponse = await app.request(jsonRequest('POST', '/api/session-starts', startBody({ attachments: [screenshot] })))
    expect(queuedResponse.status).toBe(201)
    expect(JSON.stringify(database.prepare('SELECT * FROM session_starts').all())).not.toContain(screenshot.base64)
    expect(await (await app.request(getRequest('/api/session-starts'))).text()).not.toContain(screenshot.base64)

    const claim = await (await app.request(runnerRequest('/claim', token))).json()
    expect(claim).toMatchObject({ prompt: '/workflow:start fix https://github.com/cnotv/generative-art/issues/42', attachments: [screenshot] })

    await app.request(jsonRequest('POST', '/api/session-starts', startBody()))
    expect(await (await app.request(runnerRequest('/claim', token))).json()).toMatchObject({ attachments: [] })
  })

  it('puts the attachments of a laptop cloud start inside its prompt', async () => {
    const { app, runnerTokens } = createTestApp()
    const { token } = runnerTokens.createToken('Mac mini')
    await app.request(jsonRequest('POST', '/api/session-starts', startBody({ target: 'laptop-cloud', attachments: [screenshot] })))
    const claim = z.object({ prompt: z.string(), attachments: z.array(z.unknown()) }).parse(await (await app.request(runnerRequest('/claim', token))).json())
    expect(claim.prompt).toContain(screenshot.base64)
    expect(claim.attachments).toEqual([])
  })

  it('sends a routine its attachments inside the prompt', async () => {
    const { app, firedRoutines } = createTestApp()
    await app.request(jsonRequest('PUT', '/api/repositories/cnotv/generative-art/routine', { routineId: 'trig_01ABCDEFGHJK', token: routineToken }))
    await app.request(jsonRequest('POST', '/api/session-starts', startBody({ target: 'cloud-routine', attachments: [screenshot] })))
    expect(firedRoutines[0]?.text).toContain(screenshot.base64)
  })

  it('refuses attachments too large for the session, unsafe names and repeated names', async () => {
    const { app } = createTestApp()
    const largeFile = { name: 'large.bin', mediaType: 'application/octet-stream', base64: Buffer.alloc(49 * 1024).toString('base64') }
    const tooLarge = await app.request(jsonRequest('POST', '/api/session-starts', startBody({ target: 'laptop-cloud', attachments: [largeFile] })))
    expect(tooLarge.status).toBe(413)
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ attachments: [largeFile] })))).status).toBe(201)
    const unsafeName = { ...screenshot, name: '../.ssh/authorized_keys' }
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ attachments: [unsafeName] })))).status).toBe(400)
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ attachments: [screenshot, screenshot] })))).status).toBe(400)
  })
})

describe('laptop starts', () => {
  it('queues a start that a runner claims once, then reports on', async () => {
    const { app, runnerTokens } = createTestApp()
    const { token } = runnerTokens.createToken('Mac mini')
    const queuedResponse = await app.request(jsonRequest('POST', '/api/session-starts', startBody({ note: 'Keep it small' })))
    expect(await queuedResponse.clone().json()).toMatchObject({ state: 'queued', target: 'laptop-remote-control', runnerLabel: null })
    const queuedStartId = await startIdOf(queuedResponse)

    const claimResponse = await app.request(runnerRequest('/claim', token))
    expect(await claimResponse.json()).toMatchObject({
      start: { startId: queuedStartId, state: 'claimed', runnerLabel: 'Mac mini' },
      prompt: '/workflow:start fix https://github.com/cnotv/generative-art/issues/42\n\nKeep it small',
      sessionName: 'generative-art #42 fix',
    })
    expect((await app.request(runnerRequest('/claim', token))).status).toBe(204)

    const reportResponse = await app.request(runnerRequest(`/starts/${queuedStartId}`, token, { state: 'started', message: 'In tmux' }))
    expect(await reportResponse.json()).toMatchObject({ state: 'started', message: 'In tmux' })
    expect(await (await app.request(getRequest('/api/session-starts'))).json()).toEqual([
      expect.objectContaining({ startId: queuedStartId, state: 'started' }),
    ])
  })

  it('shows a runner as online while it keeps asking', async () => {
    const clock = { now: Date.parse('2026-09-30T10:00:00Z') }
    const { app, runnerTokens } = createTestApp({}, {}, clock)
    const { token } = runnerTokens.createToken('Mac mini')
    await app.request(runnerRequest('/claim', token))
    const optionsPath = '/api/start-options?owner=cnotv&name=generative-art'
    expect(await (await app.request(getRequest(optionsPath))).json()).toEqual({
      runners: [{ label: 'Mac mini', lastSeenAt: '2026-09-30T10:00:00.000Z', isOnline: true }],
      routineConfigured: false,
      attachmentLimits: { fileCount: 5, fileTargetBytes: 8 * 1024 * 1024, inlineTargetBytes: 48 * 1024 },
    })
    clock.now += 60_000
    expect(await (await app.request(getRequest(optionsPath))).json()).toMatchObject({ runners: [{ isOnline: false }] })
  })

  it('refuses the runner routes without a runner token, even an ingest token', async () => {
    const { app, ingestTokens } = createTestApp()
    const { token } = ingestTokens.createToken('laptop')
    expect((await app.request(runnerRequest('/claim', token))).status).toBe(401)
    expect((await app.request(runnerRequest('/claim', 'adr_made-up'))).status).toBe(401)
  })

  it('lets a runner report only on starts it claimed', async () => {
    const { app, runnerTokens } = createTestApp()
    const first = runnerTokens.createToken('Mac mini').token
    const second = runnerTokens.createToken('Laptop').token
    const queuedStartId = await startIdOf(await app.request(jsonRequest('POST', '/api/session-starts', startBody())))
    await app.request(runnerRequest('/claim', first))
    expect((await app.request(runnerRequest(`/starts/${queuedStartId}`, second, { state: 'started' }))).status).toBe(404)
  })

  it('refuses repositories that are not configured and workflows the router does not know', async () => {
    const { app } = createTestApp()
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ repository: { owner: 'someone', name: 'else' } })))).status).toBe(404)
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ workflow: 'rm -rf' })))).status).toBe(400)
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ permissionMode: 'bypassPermissions' })))).status).toBe(400)
  })

  it('serves the runner script without a sign-in', async () => {
    const { app } = createTestApp({}, { signInRequired: true })
    const scriptResponse = await app.request(getRequest('/api/runner/script'))
    expect(scriptResponse.status).toBe(200)
    expect(await scriptResponse.text()).toContain('DASHI_RUNNER_TOKEN')
    expect((await app.request(getRequest('/api/session-starts'))).status).toBe(401)
  })
})

describe('cloud routine starts', () => {
  it('fires the repository routine with the prompt and keeps the session link', async () => {
    const { app, firedRoutines } = createTestApp()
    const saveResponse = await app.request(
      jsonRequest('PUT', '/api/repositories/cnotv/generative-art/routine', { routineId: 'trig_01ABCDEFGHJK', token: routineToken }),
    )
    expect(saveResponse.status).toBe(204)
    const settingsText = await (await app.request(getRequest('/api/repositories/cnotv/generative-art/routine'))).text()
    expect(JSON.parse(settingsText)).toEqual({ configured: true, routineId: 'trig_01ABCDEFGHJK' })
    expect(settingsText).not.toContain(routineToken)

    const started = await (await app.request(jsonRequest('POST', '/api/session-starts', startBody({ target: 'cloud-routine' })))).json()
    expect(started).toMatchObject({ state: 'started', sessionUrl: 'https://claude.ai/code/session_01Fired' })
    expect(firedRoutines).toEqual([
      { routineId: 'trig_01ABCDEFGHJK', routineToken, text: '/workflow:start fix https://github.com/cnotv/generative-art/issues/42' },
    ])
  })

  it('asks for a routine before firing one', async () => {
    const { app } = createTestApp()
    expect((await app.request(jsonRequest('POST', '/api/session-starts', startBody({ target: 'cloud-routine' })))).status).toBe(412)
  })
})
