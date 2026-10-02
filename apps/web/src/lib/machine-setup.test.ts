import { describe, expect, it } from 'vitest'
import { cliConnectCommands, pairingCodeFrom, platformOfUserAgent } from './machine-setup'

const scriptSha256 = 'a'.repeat(64)

describe('cliConnectCommands', () => {
  it('checks the CLI against its hash before running it, on either platform', () => {
    const macCommands = cliConnectCommands({ dashboardUrl: 'https://dash.example.com', scriptSha256, platform: 'macos' }).split('\n')
    expect(macCommands).toEqual([
      '(',
      'set -e',
      'mkdir -p ~/dashi',
      'curl -fsSL https://dash.example.com/api/cli/script -o ~/dashi/dashi.ts',
      `echo "${scriptSha256}  $HOME/dashi/dashi.ts" | shasum -a 256 -c -`,
      'node ~/dashi/dashi.ts connect https://dash.example.com',
      ')',
    ])
    const linuxCommands = cliConnectCommands({ dashboardUrl: 'https://dash.example.com', scriptSha256, platform: 'linux' })
    expect(linuxCommands).toContain('| sha256sum -c -')
    expect(linuxCommands.indexOf('sha256sum')).toBeLessThan(linuxCommands.indexOf('node ~/dashi/dashi.ts'))
  })
})

describe('pairingCodeFrom', () => {
  it('reads a code in any case, with or without its dash', () => {
    expect(pairingCodeFrom('abcd2345')).toBe('ABCD-2345')
    expect(pairingCodeFrom(' ABCD-2345 ')).toBe('ABCD-2345')
  })

  it('waits for all eight characters', () => {
    expect(pairingCodeFrom('ABCD-23')).toBeNull()
    expect(pairingCodeFrom('')).toBeNull()
  })
})

describe('platformOfUserAgent', () => {
  it('picks Linux for a Linux desktop only', () => {
    expect(platformOfUserAgent('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux')
    expect(platformOfUserAgent('Mozilla/5.0 (Linux; Android 14)')).toBe('macos')
    expect(platformOfUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('macos')
  })
})
