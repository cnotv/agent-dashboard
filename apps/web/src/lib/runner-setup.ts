import type { RunnerSetupInput } from './types'

const launchAgentLabel = 'dev.agent-dashboard.runner'

/**
 * The commands that download the runner and run it once in a terminal, to try it.
 * @param input The dashboard address and the new runner token.
 * @returns One command per line.
 */
export const runnerTryCommands = ({ dashboardUrl, runnerToken }: RunnerSetupInput): string[] => [
  'mkdir -p ~/agent-dashboard',
  `curl -fsSL ${dashboardUrl}/api/runner/script -o ~/agent-dashboard/runner.ts`,
  `AGENT_DASHBOARD_URL=${dashboardUrl} AGENT_DASHBOARD_RUNNER_TOKEN=${runnerToken} node ~/agent-dashboard/runner.ts`,
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
    'mkdir -p ~/agent-dashboard ~/Library/LaunchAgents',
    `curl -fsSL ${dashboardUrl}/api/runner/script -o ~/agent-dashboard/runner.ts`,
    `cat > ${plistPath} <<EOF`,
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    `  <key>Label</key><string>${launchAgentLabel}</string>`,
    '  <key>ProgramArguments</key><array><string>/usr/bin/env</string><string>node</string><string>$HOME/agent-dashboard/runner.ts</string></array>',
    '  <key>EnvironmentVariables</key><dict>',
    `    <key>AGENT_DASHBOARD_URL</key><string>${dashboardUrl}</string>`,
    `    <key>AGENT_DASHBOARD_RUNNER_TOKEN</key><string>${runnerToken}</string>`,
    '    <key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>',
    '  </dict>',
    '  <key>RunAtLoad</key><true/>',
    '  <key>KeepAlive</key><true/>',
    '  <key>StandardOutPath</key><string>$HOME/agent-dashboard/runner.log</string>',
    '  <key>StandardErrorPath</key><string>$HOME/agent-dashboard/runner.log</string>',
    '</dict></plist>',
    'EOF',
    `chmod 600 ${plistPath}`,
    `launchctl bootout gui/$(id -u)/${launchAgentLabel} 2>/dev/null; launchctl bootstrap gui/$(id -u) ${plistPath}`,
  ].join('\n')
}
