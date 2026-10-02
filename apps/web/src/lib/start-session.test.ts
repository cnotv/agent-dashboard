import { describe, expect, it } from 'vitest'
import type { StartOptions } from '@dashi/contracts'
import { runnerLaunchAgentCommands, runnerTryCommands } from './runner-setup'
import { defaultTargetFor, suggestedWorkflowFor, targetAvailabilityFor } from './start-session'

const onlineRunner = { label: 'Mac mini', lastSeenAt: '2026-09-30T10:00:00Z', isOnline: true }
const optionsWith = (overrides: Partial<StartOptions>): StartOptions => ({
  runners: [],
  routineConfigured: false,
  attachmentLimits: { fileCount: 5, fileTargetBytes: 8 * 1024 * 1024, inlineTargetBytes: 48 * 1024 },
  ...overrides,
})

describe('suggestedWorkflowFor', () => {
  it('reads the workflow from the first label it knows', () => {
    expect(suggestedWorkflowFor([{ name: 'P1', color: '' }, { name: 'Bug', color: '' }])).toBe('fix')
    expect(suggestedWorkflowFor([{ name: 'documentation', color: '' }])).toBe('docs')
    expect(suggestedWorkflowFor([])).toBe('feature')
  })
})

describe('targetAvailabilityFor', () => {
  it('turns a session away when the attachments are larger than it takes', () => {
    const options = optionsWith({ runners: [onlineRunner], routineConfigured: true })
    expect(targetAvailabilityFor('laptop-remote-control', options, 100 * 1024)).toEqual({ isAvailable: true, hint: null })
    expect(targetAvailabilityFor('cloud-routine', options, 100 * 1024)).toEqual({
      isAvailable: false,
      hint: 'Takes at most 48 KB of attachments',
    })
    expect(targetAvailabilityFor('laptop-cloud', options, 100 * 1024).isAvailable).toBe(false)
  })

  it('needs a routine for the cloud routine', () => {
    expect(targetAvailabilityFor('cloud-routine', optionsWith({}), 0).isAvailable).toBe(false)
    expect(targetAvailabilityFor('cloud-routine', optionsWith({ routineConfigured: true }), 0)).toEqual({ isAvailable: true, hint: null })
  })

  it('queues for a runner that is set up but offline, and refuses when none is set up', () => {
    expect(targetAvailabilityFor('laptop-headless', optionsWith({}), 0)).toEqual({
      isAvailable: false,
      hint: 'Set up the laptop runner under Credentials',
    })
    expect(targetAvailabilityFor('laptop-headless', optionsWith({ runners: [{ ...onlineRunner, isOnline: false }] }), 0)).toEqual({
      isAvailable: true,
      hint: expect.stringContaining('waits'),
    })
    expect(targetAvailabilityFor('laptop-remote-control', optionsWith({ runners: [onlineRunner] }), 0)).toEqual({ isAvailable: true, hint: null })
  })
})

describe('defaultTargetFor', () => {
  it('prefers the laptop when its runner is online, then the routine', () => {
    expect(defaultTargetFor(optionsWith({ runners: [onlineRunner], routineConfigured: true }))).toBe('laptop-remote-control')
    expect(defaultTargetFor(optionsWith({ routineConfigured: true }))).toBe('cloud-routine')
  })
})

describe('runner setup commands', () => {
  const input = { dashboardUrl: 'https://dashi.example', runnerToken: 'adr_secret' }

  it('downloads the runner from the dashboard and runs it with its token', () => {
    expect(runnerTryCommands(input)).toEqual([
      'mkdir -p ~/dashi',
      'curl -fsSL https://dashi.example/api/runner/script -o ~/dashi/runner.ts',
      'DASHI_URL=https://dashi.example DASHI_RUNNER_TOKEN=adr_secret node ~/dashi/runner.ts',
    ])
  })

  it('installs a login agent readable by this user only', () => {
    const commands = runnerLaunchAgentCommands(input)
    expect(commands).toContain('<key>DASHI_RUNNER_TOKEN</key><string>adr_secret</string>')
    expect(commands).toContain('chmod 600 ~/Library/LaunchAgents/dev.dashi.runner.plist')
    expect(commands).toContain('launchctl bootstrap gui/$(id -u)')
  })

  it('removes the runner installed under the name from before Dashi, so only one polls', () => {
    const commands = runnerLaunchAgentCommands(input)
    expect(commands).toContain('launchctl bootout gui/$(id -u)/dev.agent-dashboard.runner 2>/dev/null')
    expect(commands).toContain('rm -f ~/Library/LaunchAgents/dev.agent-dashboard.runner.plist')
    expect(commands.indexOf('dev.agent-dashboard.runner')).toBeLessThan(commands.indexOf('launchctl bootstrap'))
  })
})
