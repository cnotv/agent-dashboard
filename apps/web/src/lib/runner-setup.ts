import { checkedDownloadCommands, inSubshell } from './machine-setup'
import type { RunnerSetupInput } from './types'

const launchAgentLabel = 'dev.dashi.runner'
// The label the runner had before the app was renamed to Dashi; its agent is removed on install so
// two runners never poll with the same token.
const previousLaunchAgentLabel = 'dev.agent-dashboard.runner'
const systemdUnitPath = '~/.config/systemd/user/dashi-runner.service'

/**
 * The commands that download the runner and stop unless it is byte for byte the script whose
 * SHA-256 the dashboard showed.
 * @param input The dashboard address, the script's hash and the platform.
 * @returns One command per line.
 */
export const runnerDownloadCommands = (input: Pick<RunnerSetupInput, 'dashboardUrl' | 'scriptSha256' | 'platform'>): string[] =>
  checkedDownloadCommands({ ...input, scriptPath: '/api/runner/script', fileName: 'runner.ts' })

/**
 * The commands that download and check the runner, then open it to read before installing anything.
 * @param input The dashboard address, the script's hash and the platform.
 * @returns A shell snippet to paste into a terminal.
 */
export const runnerReviewCommands = (input: Pick<RunnerSetupInput, 'dashboardUrl' | 'scriptSha256' | 'platform'>): string =>
  inSubshell([...runnerDownloadCommands(input), 'less ~/dashi/runner.ts'])

/**
 * The commands that download and check the runner, then run it once in the terminal, to try it.
 * @param input The dashboard address, the runner token, the script's hash and the platform.
 * @returns A shell snippet to paste into a terminal.
 */
export const runnerTryCommands = (input: RunnerSetupInput): string =>
  inSubshell([...runnerDownloadCommands(input), `DASHI_URL=${input.dashboardUrl} DASHI_RUNNER_TOKEN=${input.runnerToken} node ~/dashi/runner.ts`])

/**
 * The commands that install the runner as a macOS login agent, so it starts with the Mac and
 * restarts if it stops. The token sits in the agent's file, readable by this user only.
 * @param input The dashboard address, the runner token and the script's hash.
 * @returns A shell snippet to paste into Terminal.
 */
export const runnerLaunchAgentCommands = (input: RunnerSetupInput): string => {
  const plistPath = `~/Library/LaunchAgents/${launchAgentLabel}.plist`
  return inSubshell([
    ...runnerDownloadCommands({ ...input, platform: 'macos' }),
    'mkdir -p ~/Library/LaunchAgents',
    `cat > ${plistPath} <<EOF`,
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `  <key>Label</key><string>${launchAgentLabel}</string>`,
    '  <key>ProgramArguments</key><array><string>/usr/bin/env</string><string>node</string><string>$HOME/dashi/runner.ts</string></array>',
    '  <key>EnvironmentVariables</key><dict>',
    `    <key>DASHI_URL</key><string>${input.dashboardUrl}</string>`,
    `    <key>DASHI_RUNNER_TOKEN</key><string>${input.runnerToken}</string>`,
    '    <key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>',
    '  </dict>',
    '  <key>RunAtLoad</key><true/>',
    '  <key>KeepAlive</key><true/>',
    '  <key>StandardOutPath</key><string>$HOME/dashi/runner.log</string>',
    '  <key>StandardErrorPath</key><string>$HOME/dashi/runner.log</string>',
    '</dict></plist>',
    'EOF',
    `chmod 600 ${plistPath}`,
    `plutil -lint ${plistPath}`,
    `launchctl bootout gui/$(id -u)/${previousLaunchAgentLabel} 2>/dev/null || true; rm -f ~/Library/LaunchAgents/${previousLaunchAgentLabel}.plist`,
    `launchctl bootout gui/$(id -u)/${launchAgentLabel} 2>/dev/null || true`,
    // bootout returns before launchd has removed the old job, and bootstrapping a label it still
    // holds fails with "Bootstrap failed: 5", so wait until the job is gone.
    `for attempt in 1 2 3 4 5 6 7 8 9 10; do launchctl print gui/$(id -u)/${launchAgentLabel} >/dev/null 2>&1 || break; sleep 1; done`,
    `launchctl bootstrap gui/$(id -u) ${plistPath}`,
  ])
}

/**
 * The commands that install the runner as a systemd user service on Linux, so it starts with the
 * session and restarts if it stops. The token sits in its own file, readable by this user only,
 * rather than in the unit; node and claude are found where this shell finds them.
 * @param input The dashboard address, the runner token and the script's hash.
 * @returns A shell snippet to paste into a terminal.
 */
export const runnerSystemdCommands = (input: RunnerSetupInput): string =>
  inSubshell([
    ...runnerDownloadCommands({ ...input, platform: 'linux' }),
    'mkdir -p ~/.config/systemd/user',
    '(umask 077; cat > ~/dashi/runner.env <<EOF',
    `DASHI_URL=${input.dashboardUrl}`,
    `DASHI_RUNNER_TOKEN=${input.runnerToken}`,
    'EOF',
    ')',
    'chmod 600 ~/dashi/runner.env',
    `cat > ${systemdUnitPath} <<EOF`,
    '[Unit]',
    'Description=Dashi laptop runner',
    'After=network-online.target',
    '',
    '[Service]',
    'EnvironmentFile=%h/dashi/runner.env',
    'Environment=PATH=$(dirname "$(command -v node)"):$(dirname "$(command -v claude)"):/usr/local/bin:/usr/bin:/bin',
    'ExecStart=$(command -v node) %h/dashi/runner.ts',
    'Restart=always',
    'RestartSec=5',
    '',
    '[Install]',
    'WantedBy=default.target',
    'EOF',
    'systemctl --user daemon-reload',
    'systemctl --user enable --now dashi-runner',
  ])
