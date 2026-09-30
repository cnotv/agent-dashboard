// Dashi's laptop runner. It asks the dashboard every few seconds for a session
// started from the board, prepares a fresh worktree of the repository, and starts Claude Code
// there. It needs Node 22.18 or later, git, Claude Code and, for sessions steered from the
// phone, tmux 3.2 or later. Every command is an argument list; nothing goes through a shell.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type StartTarget = 'laptop-remote-control' | 'laptop-headless' | 'laptop-cloud'
type PermissionMode = 'auto' | 'acceptEdits' | 'dontAsk'

interface RepositoryReference {
  owner: string
  name: string
}

interface ClaimedStart {
  start: { startId: string; repository: RepositoryReference; target: StartTarget; permissionMode: PermissionMode }
  prompt: string
  sessionName: string
}

interface RunnerSettings {
  dashboardUrl: string
  runnerToken: string
  runnerHome: string
  pollMilliseconds: number
}

interface RunnerPaths {
  clonePath: string
  worktreePath: string
  logPath: string
}

interface LaunchPlan {
  mode: 'tmux' | 'detached' | 'capture'
  command: string
  args: string[]
  cwd: string
}

interface LaunchOutcome {
  sessionUrl: string | null
  message: string
}

const laptopTargets: StartTarget[] = ['laptop-remote-control', 'laptop-headless', 'laptop-cloud']
const permissionModes: PermissionMode[] = ['auto', 'acceptEdits', 'dontAsk']
const defaultPollMilliseconds = 5000
const cloudCommandTimeoutMilliseconds = 180_000
const cloudSessionUrlPattern = /https:\/\/claude\.ai\/code\/session_[A-Za-z0-9_-]+/

/**
 * Checks a repository the dashboard sent before it becomes a path or a clone address.
 * @param repository The repository from the claimed start.
 * @returns True when owner and name are plain GitHub names.
 */
export const isSafeRepository = (repository: RepositoryReference): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(repository.owner) &&
  /^[A-Za-z0-9._-]{1,100}$/.test(repository.name) &&
  repository.name !== '.' &&
  repository.name !== '..'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isOneOf = <Allowed extends string>(allowedValues: Allowed[], value: unknown): value is Allowed =>
  allowedValues.some((allowedValue) => allowedValue === value)

/**
 * Reads a claim from the dashboard, checking everything in it that reaches a command line.
 * @param claimBody The parsed JSON the dashboard answered with.
 * @returns The claim, or null when any part is not one the runner knows.
 */
export const parseClaim = (claimBody: unknown): ClaimedStart | null => {
  if (!isRecord(claimBody) || !isRecord(claimBody.start)) return null
  const { start, prompt, sessionName } = claimBody
  const { startId, target, permissionMode, repository: repositoryBody } = start
  if (!isRecord(repositoryBody)) return null
  const repository = { owner: String(repositoryBody.owner), name: String(repositoryBody.name) }
  if (typeof prompt !== 'string' || typeof sessionName !== 'string' || typeof startId !== 'string') return null
  if (!/^[0-9a-f-]{36}$/.test(startId) || !isSafeRepository(repository)) return null
  if (!isOneOf(laptopTargets, target) || !isOneOf(permissionModes, permissionMode)) return null
  return { start: { startId, repository, target, permissionMode }, prompt, sessionName }
}

/**
 * Works out where a start's clone, worktree and log live under the runner's home.
 * @param runnerHome The runner's folder, ~/agent-dashboard unless set.
 * @param claimed The claimed start.
 * @returns The three paths.
 */
export const runnerPathsFor = (runnerHome: string, claimed: ClaimedStart): RunnerPaths => {
  const { owner, name } = claimed.start.repository
  const shortId = claimed.start.startId.slice(0, 8)
  return {
    clonePath: join(runnerHome, 'repos', owner, name),
    worktreePath: join(runnerHome, 'worktrees', `${name}-${shortId}`),
    logPath: join(runnerHome, 'logs', `${name}-${shortId}.log`),
  }
}

/**
 * Names the tmux session a steerable start runs in; tmux refuses dots and colons.
 * @param claimed The claimed start.
 * @returns The tmux session name.
 */
export const tmuxSessionNameFor = (claimed: ClaimedStart): string =>
  `agent-${claimed.start.repository.name.replace(/[^A-Za-z0-9-]/g, '-')}-${claimed.start.startId.slice(0, 8)}`

/**
 * Decides the command that starts a claimed session, by where it should run.
 * @param claimed The claimed start.
 * @param paths Where its clone, worktree and log live.
 * @returns The command, its arguments and folder, and how to run it.
 */
export const launchPlanFor = (claimed: ClaimedStart, paths: RunnerPaths): LaunchPlan => {
  if (claimed.start.target === 'laptop-cloud') {
    return { mode: 'capture', command: 'claude', args: ['--cloud', claimed.prompt], cwd: paths.clonePath }
  }
  if (claimed.start.target === 'laptop-headless') {
    return {
      mode: 'detached',
      command: 'claude',
      args: ['-p', claimed.prompt, '--permission-mode', claimed.start.permissionMode, '--output-format', 'json'],
      cwd: paths.worktreePath,
    }
  }
  // Remote Control needs a terminal, so the session gets one from tmux; with more than one
  // argument tmux runs the command directly, not through a shell.
  return {
    mode: 'tmux',
    command: 'tmux',
    args: [
      'new-session',
      '-d',
      '-s',
      tmuxSessionNameFor(claimed),
      '-c',
      paths.worktreePath,
      'claude',
      '--remote-control',
      '--name',
      claimed.sessionName,
      claimed.prompt,
    ],
    cwd: paths.worktreePath,
  }
}

/**
 * Finds the claude.ai link a cloud session prints when it starts.
 * @param commandOutput What claude --cloud wrote.
 * @returns The link, or null when there is none.
 */
export const cloudSessionUrlFrom = (commandOutput: string): string | null => cloudSessionUrlPattern.exec(commandOutput)?.[0] ?? null

/**
 * Reads the runner's settings from its environment.
 * @param environment The process environment.
 * @returns The settings, or the reason they are incomplete.
 */
export const readRunnerSettings = (environment: NodeJS.ProcessEnv): RunnerSettings | string => {
  const dashboardUrl = (environment.AGENT_DASHBOARD_URL ?? '').replace(/\/+$/, '')
  const runnerToken = environment.AGENT_DASHBOARD_RUNNER_TOKEN ?? ''
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(dashboardUrl)) {
    return 'Set AGENT_DASHBOARD_URL to the dashboard address, https:// unless it runs on this machine'
  }
  if (!runnerToken.startsWith('adr_')) return 'Set AGENT_DASHBOARD_RUNNER_TOKEN to a runner token from the dashboard'
  return {
    dashboardUrl,
    runnerToken,
    runnerHome: environment.AGENT_DASHBOARD_RUNNER_HOME ?? join(homedir(), 'agent-dashboard'),
    pollMilliseconds: Number(environment.AGENT_DASHBOARD_RUNNER_POLL_MS ?? defaultPollMilliseconds),
  }
}

const lastCharacters = (text: string, characterCount: number): string => text.trim().slice(-characterCount)

const runOrThrow = (command: string, args: string[], cwd?: string): void => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  if (result.error) throw new Error(`${command} could not start: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${command} ${args[0] ?? ''} failed: ${lastCharacters(result.stderr, 500)}`)
}

const prepareClone = ({ repository }: ClaimedStart['start'], clonePath: string): void => {
  if (!existsSync(clonePath)) {
    mkdirSync(dirname(clonePath), { recursive: true })
    runOrThrow('git', ['clone', `https://github.com/${repository.owner}/${repository.name}.git`, clonePath])
  }
  runOrThrow('git', ['-C', clonePath, 'fetch', '--prune', 'origin'])
}

const prepareWorktree = ({ clonePath, worktreePath }: RunnerPaths): void => {
  mkdirSync(dirname(worktreePath), { recursive: true })
  runOrThrow('git', ['-C', clonePath, 'worktree', 'add', '--detach', worktreePath, 'origin/HEAD'])
}

const launch = (plan: LaunchPlan, claimed: ClaimedStart, paths: RunnerPaths): LaunchOutcome => {
  if (plan.mode === 'capture') {
    const result = spawnSync(plan.command, plan.args, { cwd: plan.cwd, encoding: 'utf8', timeout: cloudCommandTimeoutMilliseconds })
    const commandOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const sessionUrl = cloudSessionUrlFrom(commandOutput)
    if (sessionUrl === null) throw new Error(`claude --cloud printed no session link: ${lastCharacters(commandOutput, 500)}`)
    return { sessionUrl, message: 'Running in Claude cloud' }
  }
  if (plan.mode === 'detached') {
    mkdirSync(dirname(paths.logPath), { recursive: true })
    const logDescriptor = openSync(paths.logPath, 'a')
    spawn(plan.command, plan.args, { cwd: plan.cwd, detached: true, stdio: ['ignore', logDescriptor, logDescriptor] }).unref()
    return { sessionUrl: null, message: `Running unattended in ${plan.cwd}; its output goes to ${paths.logPath}` }
  }
  const result = spawnSync(plan.command, plan.args, { encoding: 'utf8' })
  if (result.error) throw new Error('tmux is needed for sessions steered from the phone: brew install tmux')
  if (result.status !== 0) throw new Error(`tmux failed: ${lastCharacters(result.stderr, 500)}`)
  return {
    sessionUrl: null,
    message: `Open "${claimed.sessionName}" in the Claude app; on the laptop, tmux attach -t ${tmuxSessionNameFor(claimed)}`,
  }
}

const reportOutcome = async (settings: RunnerSettings, startId: string, report: unknown): Promise<void> => {
  await fetch(`${settings.dashboardUrl}/api/runner/starts/${startId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.runnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(15000),
  })
}

const startClaimedSession = async (settings: RunnerSettings, claimed: ClaimedStart): Promise<void> => {
  const paths = runnerPathsFor(settings.runnerHome, claimed)
  try {
    prepareClone(claimed.start, paths.clonePath)
    if (claimed.start.target !== 'laptop-cloud') prepareWorktree(paths)
    const outcome = launch(launchPlanFor(claimed, paths), claimed, paths)
    process.stdout.write(`Started ${claimed.sessionName}: ${outcome.message}\n`)
    await reportOutcome(settings, claimed.start.startId, { state: 'started', ...outcome })
  } catch (startError) {
    const message = startError instanceof Error ? startError.message : String(startError)
    process.stdout.write(`Could not start ${claimed.sessionName}: ${message}\n`)
    await reportOutcome(settings, claimed.start.startId, { state: 'failed', sessionUrl: null, message })
  }
}

const pollOnce = async (settings: RunnerSettings): Promise<void> => {
  const claimResponse = await fetch(`${settings.dashboardUrl}/api/runner/claim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.runnerToken}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15000),
  })
  if (claimResponse.status === 204) return
  if (!claimResponse.ok) throw new Error(`The dashboard answered ${claimResponse.status}`)
  const claimed = parseClaim(await claimResponse.json())
  if (claimed === null) {
    process.stderr.write('The runner refused a start it could not read\n')
    return
  }
  await startClaimedSession(settings, claimed)
}

const pollForever = (settings: RunnerSettings): void => {
  pollOnce(settings)
    .catch((pollError: unknown) => process.stderr.write(`${pollError instanceof Error ? pollError.message : String(pollError)}\n`))
    .finally(() => setTimeout(() => pollForever(settings), settings.pollMilliseconds))
}

const isRunDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isRunDirectly) {
  const settings = readRunnerSettings(process.env)
  if (typeof settings === 'string') {
    process.stderr.write(`${settings}\n`)
    process.exit(1)
  }
  process.stdout.write(`Waiting for sessions from ${settings.dashboardUrl}; working in ${settings.runnerHome}\n`)
  pollForever(settings)
}
