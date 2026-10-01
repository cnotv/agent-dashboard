// Dashi's laptop runner. It asks the dashboard every few seconds for a session
// started from the board, prepares a fresh worktree of the repository, and starts Claude Code
// there. While a chat drawer is open in Dashi it also sends that session's recent transcript and
// delivers the messages typed there. It needs Node 22.18 or later, git, Claude Code and, for
// sessions steered from the phone, tmux 3.2 or later. Every command is an argument list; nothing
// goes through a shell.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
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
  claudeHome: string
  pollMilliseconds: number
}

type SessionState = 'working' | 'waiting' | 'idle' | 'ended' | 'inactive'

interface ChatWorkSession {
  sessionId: string
  sessionState: SessionState | null
}

interface ChatWorkDelivery extends ChatWorkSession {
  deliveryId: string
  text: string
}

interface ChatWork {
  sessions: ChatWorkSession[]
  deliveries: ChatWorkDelivery[]
}

interface ChatMessage {
  messageId: string
  role: 'user' | 'assistant'
  kind: 'text' | 'tool'
  text: string
  toolName: string | null
  createdAt: string | null
}

interface TranscriptSummary {
  directory: string | null
  messages: ChatMessage[]
}

interface TmuxPane {
  paneId: string
  directory: string
  command: string
}

type DeliveryPlan = { route: 'tmux'; paneId: string } | { route: 'resume'; directory: string } | { route: 'none'; reason: string }

interface SentTranscript {
  modifiedAt: number
  sentAt: number
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
const chatPollMilliseconds = 1500
const transcriptResendMilliseconds = 15_000
const transcriptMessageLimit = 150
const chatTextLimit = 4000
const toolSummaryLimit = 300
const sessionStates: SessionState[] = ['working', 'waiting', 'idle', 'ended', 'inactive']
const sessionIdPattern = /^[A-Za-z0-9_-]{8,100}$/
const deliveryIdPattern = /^[0-9a-f-]{36}$/
// A pane showing a shell would run pasted text as a command, so only a pane whose foreground
// process is Claude Code gets it. Claude Code names its process claude, or its version on some
// installs; a bare node pane is only a fallback, since a dev server in the same folder runs as node too.
const claudePaneCommandPattern = /^(claude|\d+\.\d+\.\d+)$/
const fallbackPaneCommand = 'node'

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

const chatWorkSessionOf = (value: unknown): ChatWorkSession | null => {
  if (!isRecord(value) || typeof value.sessionId !== 'string' || !sessionIdPattern.test(value.sessionId)) return null
  const sessionState = value.sessionState === null ? null : isOneOf(sessionStates, value.sessionState) ? value.sessionState : undefined
  return sessionState === undefined ? null : { sessionId: value.sessionId, sessionState }
}

const chatWorkDeliveryOf = (value: unknown): ChatWorkDelivery | null => {
  const workSession = chatWorkSessionOf(value)
  if (workSession === null || !isRecord(value)) return null
  const { deliveryId, text } = value
  if (typeof deliveryId !== 'string' || !deliveryIdPattern.test(deliveryId) || typeof text !== 'string' || text.length > 8000) return null
  return { ...workSession, deliveryId, text }
}

/**
 * Reads the chat work the dashboard hands out, keeping only entries whose ids are safe to use as
 * file names and command arguments.
 * @param workBody The parsed JSON the dashboard answered with.
 * @returns The sessions to read and the messages to deliver.
 */
export const parseChatWork = (workBody: unknown): ChatWork => {
  if (!isRecord(workBody)) return { sessions: [], deliveries: [] }
  const listOf = <Item>(value: unknown, itemOf: (entry: unknown) => Item | null): Item[] =>
    Array.isArray(value)
      ? value.flatMap((entry): Item[] => {
          const item = itemOf(entry)
          return item === null ? [] : [item]
        })
      : []
  return { sessions: listOf(workBody.sessions, chatWorkSessionOf), deliveries: listOf(workBody.deliveries, chatWorkDeliveryOf) }
}

const clipped = (text: string, characterLimit: number): string => (text.length > characterLimit ? `${text.slice(0, characterLimit)}…` : text)

const summaryOfToolInput = (input: unknown): string => {
  if (!isRecord(input)) return ''
  const summary = [input.command, input.file_path, input.pattern, input.url, input.description, input.prompt].find(
    (candidate) => typeof candidate === 'string' && candidate.length > 0,
  )
  return typeof summary === 'string' ? clipped(summary.replace(/\s+/g, ' '), toolSummaryLimit) : ''
}

// A slash command reaches the transcript as tagged text; it is shown as it was typed, and the
// output of local commands is left out.
const userTextOf = (text: string): string | null => {
  if (text.startsWith('<local-command') || text.startsWith('Caveat:')) return null
  const commandName = /<command-name>([^<]*)<\/command-name>/.exec(text)?.[1]
  if (commandName === undefined) return text
  const commandArguments = /<command-args>([^<]*)<\/command-args>/.exec(text)?.[1] ?? ''
  return `${commandName} ${commandArguments}`.trim()
}

const messagesOfEntry = (entry: Record<string, unknown>): ChatMessage[] => {
  const { type, uuid, timestamp, message } = entry
  if ((type !== 'user' && type !== 'assistant') || typeof uuid !== 'string' || !isRecord(message)) return []
  if (entry.isSidechain === true || entry.isMeta === true) return []
  const createdAt = typeof timestamp === 'string' ? timestamp : null
  const textMessage = (text: string, index: number): ChatMessage => ({
    messageId: `${uuid}-${index}`,
    role: type,
    kind: 'text',
    text: clipped(text, chatTextLimit),
    toolName: null,
    createdAt,
  })
  const { content } = message
  if (typeof content === 'string') {
    const text = type === 'user' ? userTextOf(content) : content
    return text === null || text.trim() === '' ? [] : [textMessage(text, 0)]
  }
  if (!Array.isArray(content)) return []
  return content.flatMap((block: unknown, index): ChatMessage[] => {
    if (!isRecord(block)) return []
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      const text = type === 'user' ? userTextOf(block.text) : block.text
      return text === null ? [] : [textMessage(text, index)]
    }
    if (block.type === 'tool_use' && type === 'assistant' && typeof block.name === 'string') {
      return [{ messageId: `${uuid}-${index}`, role: 'assistant', kind: 'tool', text: summaryOfToolInput(block.input), toolName: block.name, createdAt }]
    }
    return []
  })
}

const parsedLineOf = (line: string): Record<string, unknown> | null => {
  try {
    const parsedLine: unknown = JSON.parse(line)
    return isRecord(parsedLine) ? parsedLine : null
  } catch {
    return null
  }
}

/**
 * Turns a Claude Code transcript into the chat the drawer shows: what was typed, what Claude
 * answered and which tools it used, without tool results, thinking or side conversations.
 * @param transcriptText The session's .jsonl transcript.
 * @returns The folder the session runs in and its most recent messages.
 */
export const summariseTranscript = (transcriptText: string): TranscriptSummary => {
  const entries = transcriptText.split('\n').flatMap((line): Record<string, unknown>[] => {
    const parsedLine = parsedLineOf(line)
    return parsedLine === null ? [] : [parsedLine]
  })
  const directory = entries.map((entry) => entry.cwd).find((cwd): cwd is string => typeof cwd === 'string') ?? null
  return { directory, messages: entries.flatMap(messagesOfEntry).slice(-transcriptMessageLimit) }
}

/**
 * Reads the output of tmux list-panes in the runner's format: pane id, command, then the folder.
 * tmux prints a tab in a format as an underscore, so the fields are split on spaces and the
 * folder, which may hold spaces itself, comes last.
 * @param listOutput What tmux printed.
 * @returns One entry per pane.
 */
export const parseTmuxPanes = (listOutput: string): TmuxPane[] =>
  listOutput.split('\n').flatMap((line) => {
    const [paneId, command, ...directoryParts] = line.split(' ')
    const directory = directoryParts.join(' ')
    return paneId && command && directory && /^%\d+$/.test(paneId) ? [{ paneId, directory, command }] : []
  })

/**
 * Decides how a message reaches a session: typed into the tmux pane running it, or given to a
 * resumed copy of a session that has ended. A session asking for a permission is left alone, since
 * the message would land on the permission prompt.
 * @param sessionState The state Dashi knows for the session, or null when its hooks never reported.
 * @param panes The tmux panes on this machine.
 * @param directory The folder the session runs in, from its transcript.
 * @returns The route, or why there is none.
 */
export const deliveryPlanFor = (sessionState: SessionState | null, panes: TmuxPane[], directory: string | null): DeliveryPlan => {
  if (directory === null) return { route: 'none', reason: 'The transcript does not say which folder the session runs in' }
  if (sessionState === 'waiting') return { route: 'none', reason: 'It is waiting on a permission or a question; answer it in the Claude app or the terminal' }
  if (sessionState === 'ended' || sessionState === 'inactive') return { route: 'resume', directory }
  const panesInFolder = panes.filter((candidate) => candidate.directory === directory)
  const pane =
    panesInFolder.find((candidate) => claudePaneCommandPattern.test(candidate.command)) ??
    panesInFolder.find((candidate) => candidate.command === fallbackPaneCommand)
  if (pane !== undefined) return { route: 'tmux', paneId: pane.paneId }
  return { route: 'none', reason: 'It runs in a terminal the runner cannot type into; sessions started from Dashi, or run in tmux, can be chatted with' }
}

/**
 * The command line that continues an ended session with one message, unattended.
 * @param sessionId The session to resume.
 * @param text The message.
 * @returns The arguments for claude.
 */
export const resumeArgumentsFor = (sessionId: string, text: string): string[] => [
  '--resume',
  sessionId,
  '-p',
  text,
  '--permission-mode',
  'auto',
  '--output-format',
  'json',
]

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
    claudeHome: environment.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'),
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

const postToDashboard = (settings: RunnerSettings, path: string, body: unknown): Promise<Response> =>
  fetch(`${settings.dashboardUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.runnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

const realDirectoryOf = (directory: string): string => {
  try {
    return realpathSync(directory)
  } catch {
    return directory
  }
}

const findTranscriptPath = (claudeHome: string, sessionId: string): string | null => {
  const projectsPath = join(claudeHome, 'projects')
  try {
    return (
      readdirSync(projectsPath)
        .map((projectFolder) => join(projectsPath, projectFolder, `${sessionId}.jsonl`))
        .find((candidatePath) => existsSync(candidatePath)) ?? null
    )
  } catch {
    return null
  }
}

const listTmuxPanes = (): TmuxPane[] => {
  const result = spawnSync('tmux', ['list-panes', '-a', '-F', '#{pane_id} #{pane_current_command} #{pane_current_path}'], { encoding: 'utf8' })
  if (result.error || result.status !== 0) return []
  return parseTmuxPanes(result.stdout).map((pane) => ({ ...pane, directory: realDirectoryOf(pane.directory) }))
}

const readSessionTranscript = (settings: RunnerSettings, sessionId: string): TranscriptSummary | null => {
  const transcriptPath = findTranscriptPath(settings.claudeHome, sessionId)
  if (transcriptPath === null) return null
  const summary = summariseTranscript(readFileSync(transcriptPath, 'utf8'))
  return { ...summary, directory: summary.directory === null ? null : realDirectoryOf(summary.directory) }
}

// A transcript is sent again only when it changed, or now and then so a reopened drawer fills.
const sendTranscript = async (settings: RunnerSettings, workSession: ChatWorkSession, sentTranscripts: Map<string, SentTranscript>): Promise<void> => {
  const transcriptPath = findTranscriptPath(settings.claudeHome, workSession.sessionId)
  const modifiedAt = transcriptPath === null ? 0 : statSync(transcriptPath).mtimeMs
  const lastSent = sentTranscripts.get(workSession.sessionId)
  if (lastSent && lastSent.modifiedAt === modifiedAt && Date.now() - lastSent.sentAt < transcriptResendMilliseconds) return
  const summary = readSessionTranscript(settings, workSession.sessionId)
  const plan = deliveryPlanFor(workSession.sessionState, summary === null ? [] : listTmuxPanes(), summary?.directory ?? null)
  const report = {
    found: summary !== null,
    messages: summary?.messages ?? [],
    deliveryRoute: plan.route,
    sendBlocker: plan.route === 'none' ? plan.reason : null,
  }
  const reportResponse = await postToDashboard(settings, `/api/runner/chat/${workSession.sessionId}`, report)
  if (reportResponse.ok) sentTranscripts.set(workSession.sessionId, { modifiedAt, sentAt: Date.now() })
}

const runTmux = (args: string[], input?: string): void => {
  const result = spawnSync('tmux', args, { encoding: 'utf8', input })
  if (result.error || result.status !== 0) throw new Error(`tmux ${args[0] ?? ''} failed: ${lastCharacters(result.stderr ?? '', 300)}`)
}

// Pasted as a bracketed paste, so a message of several lines arrives whole instead of being sent
// line by line, then submitted with Enter.
const typeIntoPane = (paneId: string, text: string): void => {
  const bufferName = `dashi-${process.pid}`
  runTmux(['load-buffer', '-b', bufferName, '-'], text)
  runTmux(['paste-buffer', '-p', '-d', '-b', bufferName, '-t', paneId])
  runTmux(['send-keys', '-t', paneId, 'Enter'])
}

const resumeWithMessage = (settings: RunnerSettings, delivery: ChatWorkDelivery, directory: string): string => {
  const logPath = join(settings.runnerHome, 'logs', `chat-${delivery.sessionId.slice(0, 8)}.log`)
  mkdirSync(dirname(logPath), { recursive: true })
  const logDescriptor = openSync(logPath, 'a')
  spawn('claude', resumeArgumentsFor(delivery.sessionId, delivery.text), {
    cwd: directory,
    detached: true,
    stdio: ['ignore', logDescriptor, logDescriptor],
  }).unref()
  return `Resumed unattended; its output goes to ${logPath}`
}

const deliverMessage = async (settings: RunnerSettings, delivery: ChatWorkDelivery): Promise<void> => {
  const summary = readSessionTranscript(settings, delivery.sessionId)
  const plan =
    summary === null
      ? { route: 'none' as const, reason: 'The session is not on this laptop' }
      : deliveryPlanFor(delivery.sessionState, listTmuxPanes(), summary.directory)
  const outcome = ((): { state: 'delivered' | 'failed'; message: string | null } => {
    try {
      if (plan.route === 'tmux') {
        typeIntoPane(plan.paneId, delivery.text)
        return { state: 'delivered', message: null }
      }
      if (plan.route === 'resume') return { state: 'delivered', message: resumeWithMessage(settings, delivery, plan.directory) }
      return { state: 'failed', message: plan.reason }
    } catch (deliveryError) {
      return { state: 'failed', message: deliveryError instanceof Error ? deliveryError.message : String(deliveryError) }
    }
  })()
  await postToDashboard(settings, `/api/runner/deliveries/${delivery.deliveryId}`, outcome)
}

// Returns whether any drawer is open, so the loop asks again sooner while someone is chatting.
const relayChatsOnce = async (settings: RunnerSettings, sentTranscripts: Map<string, SentTranscript>): Promise<boolean> => {
  const workResponse = await postToDashboard(settings, '/api/runner/chat-work', {})
  if (!workResponse.ok) return false
  const work = parseChatWork(await workResponse.json())
  await work.deliveries.reduce(
    (previous, delivery) =>
      previous.then(async () => {
        await deliverMessage(settings, delivery)
        sentTranscripts.delete(delivery.sessionId)
      }),
    Promise.resolve(),
  )
  await Promise.all(work.sessions.map((workSession) => sendTranscript(settings, workSession, sentTranscripts)))
  return work.sessions.length > 0
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

const writePollError = (pollError: unknown): false => {
  process.stderr.write(`${pollError instanceof Error ? pollError.message : String(pollError)}\n`)
  return false
}

const pollForever = (settings: RunnerSettings, sentTranscripts: Map<string, SentTranscript>): void => {
  pollOnce(settings)
    .catch(writePollError)
    .then(() => relayChatsOnce(settings, sentTranscripts).catch(writePollError))
    .then((isChatOpen) =>
      setTimeout(() => pollForever(settings, sentTranscripts), isChatOpen ? chatPollMilliseconds : settings.pollMilliseconds),
    )
}

const isRunDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isRunDirectly) {
  const settings = readRunnerSettings(process.env)
  if (typeof settings === 'string') {
    process.stderr.write(`${settings}\n`)
    process.exit(1)
  }
  process.stdout.write(`Waiting for sessions from ${settings.dashboardUrl}; working in ${settings.runnerHome}\n`)
  pollForever(settings, new Map())
}
