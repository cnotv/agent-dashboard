import type { MachinePlatform } from '@dashi/contracts'
import type { ScriptDownloadInput } from './types'

export const platformLabels: Record<MachinePlatform, string> = { macos: 'macOS', linux: 'Linux' }

const hashCheckCommandOf: Record<MachinePlatform, string> = { macos: 'shasum -a 256 -c -', linux: 'sha256sum -c -' }

/**
 * Guesses the platform of the machine this page is open on, to preselect its commands.
 * @param userAgent The browser's user agent.
 * @returns linux for a Linux desktop, otherwise macos.
 */
export const platformOfUserAgent = (userAgent: string): MachinePlatform =>
  userAgent.includes('Linux') && !userAgent.includes('Android') ? 'linux' : 'macos'

/**
 * Wraps commands in one subshell with set -e, so a failed download or a hash that does not match
 * stops them there without closing the terminal they were pasted into.
 * @param commands One command per entry.
 * @returns A shell snippet to paste into a terminal.
 */
export const inSubshell = (commands: string[]): string => ['(', 'set -e', ...commands, ')'].join('\n')

/**
 * The commands that download a script this dashboard serves into ~/dashi and stop unless it is
 * byte for byte the script whose SHA-256 the dashboard showed.
 * @param input The dashboard address, the script's path and hash, the file to save and the platform.
 * @returns One command per line.
 */
export const checkedDownloadCommands = ({ dashboardUrl, scriptPath, fileName, scriptSha256, platform }: ScriptDownloadInput): string[] => [
  'mkdir -p ~/dashi',
  `curl -fsSL ${dashboardUrl}${scriptPath} -o ~/dashi/${fileName}`,
  `echo "${scriptSha256}  $HOME/dashi/${fileName}" | ${hashCheckCommandOf[platform]}`,
]

/**
 * The one command that sets a machine up: it downloads the dashi CLI, checks its hash, and runs
 * dashi connect, which pairs with this dashboard through a code approved here.
 * @param input The dashboard address, the CLI's hash and the platform.
 * @returns A shell snippet to paste into a terminal.
 */
export const cliConnectCommands = (input: Pick<ScriptDownloadInput, 'dashboardUrl' | 'scriptSha256' | 'platform'>): string =>
  inSubshell([
    ...checkedDownloadCommands({ ...input, scriptPath: '/api/cli/script', fileName: 'dashi.ts' }),
    `node ~/dashi/dashi.ts connect ${input.dashboardUrl}`,
  ])

/**
 * Reads a pairing code as typed, in any case and with or without its dash.
 * @param typedCode The code from the link or the field.
 * @returns The code as XXXX-XXXX, or null until all eight characters are there.
 */
export const pairingCodeFrom = (typedCode: string): string | null => {
  const compact = typedCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : null
}
