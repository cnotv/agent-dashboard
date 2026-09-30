import { describe, expect, it } from 'vitest'
import { cloudSessionUrlFrom, launchPlanFor, parseClaim, readRunnerSettings, runnerPathsFor, tmuxSessionNameFor } from './runner.ts'

const startId = '0123abcd-0000-4000-8000-000000000000'
const claimBody = (overrides: Record<string, unknown> = {}) => ({
  start: {
    startId,
    repository: { owner: 'cnotv', name: 'generative-art' },
    target: 'laptop-remote-control',
    permissionMode: 'auto',
    ...overrides,
  },
  prompt: '/workflow:start fix https://github.com/cnotv/generative-art/issues/42\n\nKeep it small; $(rm -rf ~) stays text',
  sessionName: 'generative-art #42 fix',
})

const claimOf = (overrides: Record<string, unknown> = {}) => {
  const claimed = parseClaim(claimBody(overrides))
  if (claimed === null) throw new Error('The test claim did not parse')
  return claimed
}

describe('parseClaim', () => {
  it('accepts a claim the dashboard can send', () => {
    expect(claimOf().start.repository).toEqual({ owner: 'cnotv', name: 'generative-art' })
  })

  it('refuses repositories that could escape the runner folder, and unknown targets or modes', () => {
    expect(parseClaim(claimBody({ repository: { owner: 'cnotv', name: '..' } }))).toBeNull()
    expect(parseClaim(claimBody({ repository: { owner: '../etc', name: 'x' } }))).toBeNull()
    expect(parseClaim(claimBody({ target: 'cloud-routine' }))).toBeNull()
    expect(parseClaim(claimBody({ permissionMode: 'bypassPermissions' }))).toBeNull()
    expect(parseClaim(claimBody({ startId: '../../x' }))).toBeNull()
    expect(parseClaim({ start: null })).toBeNull()
  })
})

describe('launchPlanFor', () => {
  const paths = runnerPathsFor('/Users/me/agent-dashboard', claimOf())

  it('starts a steerable session in tmux, passing the prompt as one argument', () => {
    const plan = launchPlanFor(claimOf(), paths)
    expect(plan.mode).toBe('tmux')
    expect(plan.args).toEqual([
      'new-session',
      '-d',
      '-s',
      'agent-generative-art-0123abcd',
      '-c',
      '/Users/me/agent-dashboard/worktrees/generative-art-0123abcd',
      'claude',
      '--remote-control',
      '--name',
      'generative-art #42 fix',
      claimOf().prompt,
    ])
  })

  it('runs an unattended session with the chosen permission mode', () => {
    const plan = launchPlanFor(claimOf({ target: 'laptop-headless', permissionMode: 'acceptEdits' }), paths)
    expect(plan).toMatchObject({ mode: 'detached', command: 'claude', cwd: paths.worktreePath })
    expect(plan.args).toEqual(['-p', claimOf().prompt, '--permission-mode', 'acceptEdits', '--output-format', 'json'])
  })

  it('sends a cloud session from the clone itself', () => {
    expect(launchPlanFor(claimOf({ target: 'laptop-cloud' }), paths)).toEqual({
      mode: 'capture',
      command: 'claude',
      args: ['--cloud', claimOf().prompt],
      cwd: '/Users/me/agent-dashboard/repos/cnotv/generative-art',
    })
  })
})

describe('tmuxSessionNameFor', () => {
  it('replaces the dots tmux refuses', () => {
    expect(tmuxSessionNameFor(claimOf({ repository: { owner: 'cnotv', name: 'site.io' } }))).toBe('agent-site-io-0123abcd')
  })
})

describe('cloudSessionUrlFrom', () => {
  it('finds the session link in what claude --cloud printed', () => {
    expect(cloudSessionUrlFrom('Created cloud session\nhttps://claude.ai/code/session_01AbC-x_9 (open it)')).toBe(
      'https://claude.ai/code/session_01AbC-x_9',
    )
    expect(cloudSessionUrlFrom('error: not logged in')).toBeNull()
  })
})

describe('readRunnerSettings', () => {
  it('needs an https dashboard, or one on this machine, and a runner token', () => {
    expect(readRunnerSettings({ AGENT_DASHBOARD_URL: 'http://dashi.example', AGENT_DASHBOARD_RUNNER_TOKEN: 'adr_x' })).toEqual(
      expect.stringContaining('https://'),
    )
    expect(readRunnerSettings({ AGENT_DASHBOARD_URL: 'https://dashi.example/', AGENT_DASHBOARD_RUNNER_TOKEN: 'adt_x' })).toEqual(
      expect.stringContaining('runner token'),
    )
    expect(
      readRunnerSettings({ AGENT_DASHBOARD_URL: 'https://dashi.example/', AGENT_DASHBOARD_RUNNER_TOKEN: 'adr_x', AGENT_DASHBOARD_RUNNER_HOME: '/tmp/r' }),
    ).toEqual({ dashboardUrl: 'https://dashi.example', runnerToken: 'adr_x', runnerHome: '/tmp/r', pollMilliseconds: 5000 })
  })
})
