import type { RunnerSetupInput } from './types'

const launchAgentLabel = 'dev.dashi.runner'
// The label the runner had before the app was renamed to Dashi; its agent is removed on install so
// two runners never poll with the same token.
const previousLaunchAgentLabel = 'dev.agent-dashboard.runner'

/**
 * The commands that download the runner and run it once in a terminal, to try it.
 * @param input The dashboard address and the new runner token.
 * @returns One command per line.
 */
export const runnerTryCommands = ({ dashboardUrl, runnerToken }: RunnerSetupInput): string[] => [
  'mkdir -p ~/dashi',
  `curl -fsSL ${dashboardUrl}/api/runner/script -o ~/dashi/runner.ts`,
  `DASHI_URL=${dashboardUrl} DASHI_RUNNER_TOKEN=${runnerToken} node ~/dashi/runner.ts`,
]

/**
 * The commands that install the runner as a macOS login agent, so it starts with the laptop and
 * restarts if it stops. The token sits in the agent's file, readable by this user only.
 * @param input The dashboard address and the new runner token.
 * @returns A shell snippet to paste into Terminal.
 */
export const runnerLaunchAgentCommands = ({ dashboardUrl, runnerToken }: RunnerSetupInput): string => {
  const plistPath = `~/Library/LaunchAgents/${launchAgentLabel}.plist`
  return [
    'mkdir -p ~/dashi ~/Library/LaunchAgents',
    `curl -fsSL ${dashboardUrl}/api/runner/script -o ~/dashi/runner.ts`,
    `cat > ${plistPath} <<EOF`,
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `  <key>Label</key><string>${launchAgentLabel}</string>`,
    '  <key>ProgramArguments</key><array><string>/usr/bin/env</string><string>node</string><string>$HOME/dashi/runner.ts</string></array>',
    '  <key>EnvironmentVariables</key><dict>',
    `    <key>DASHI_URL</key><string>${dashboardUrl}</string>`,
    `    <key>DASHI_RUNNER_TOKEN</key><string>${runnerToken}</string>`,
    '    <key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>',
    '  </dict>',
    '  <key>RunAtLoad</key><true/>',
    '  <key>KeepAlive</key><true/>',
    '  <key>StandardOutPath</key><string>$HOME/dashi/runner.log</string>',
    '  <key>StandardErrorPath</key><string>$HOME/dashi/runner.log</string>',
    '</dict></plist>',
    'EOF',
    `chmod 600 ${plistPath}`,
    `launchctl bootout gui/$(id -u)/${previousLaunchAgentLabel} 2>/dev/null; rm -f ~/Library/LaunchAgents/${previousLaunchAgentLabel}.plist`,
    `launchctl bootout gui/$(id -u)/${launchAgentLabel} 2>/dev/null; launchctl bootstrap gui/$(id -u) ${plistPath}`,
  ].join('\n')
}
