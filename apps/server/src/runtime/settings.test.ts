import { describe, expect, it } from 'vitest'
import { isAllowedHostHeader, isSameOriginRequest, resolveRuntimeSettings, withPreviousSettingNames } from './settings.ts'

const resolveWith = (environment: Record<string, string | undefined>) =>
  resolveRuntimeSettings({
    environment,
    readSecretFile: (filePath) => (filePath.includes('github') ? 'secret-from-file\n' : 'key-from-file'),
    defaultRepositoriesFile: '/repo/config/repos.json',
    defaultWebDistDirectory: '/repo/apps/web/dist',
  })

const cloudEnvironment = {
  DASHI_MODE: 'cloud',
  DASHI_PUBLIC_URL: 'https://dash.example.com',
  DASHI_GITHUB_APP_CLIENT_ID: 'Iv23example',
  DASHI_GITHUB_APP_CLIENT_SECRET_FILE: '/run/secrets/github-app-client-secret',
  DASHI_ALLOWED_USERS: 'cnotv, friend',
}

describe('resolveRuntimeSettings', () => {
  it('defaults to local mode on loopback', () => {
    expect(resolveWith({})).toEqual({
      ok: true,
      settings: expect.objectContaining({ mode: 'local', host: '127.0.0.1', port: 4317, masterKeyEncoded: null }),
    })
  })

  it('refuses a public interface in local mode', () => {
    expect(resolveWith({ DASHI_HOST: '0.0.0.0' })).toEqual({ ok: false, reason: expect.stringContaining('loopback') })
  })

  it('allows every interface when the container publishes on loopback', () => {
    expect(resolveWith({ DASHI_HOST: '0.0.0.0', DASHI_PUBLISHED_ON_LOOPBACK: '1' }).ok).toBe(true)
  })

  it('refuses cloud mode without an https address and GitHub sign-in', () => {
    expect(resolveWith({ DASHI_MODE: 'cloud' })).toEqual({ ok: false, reason: expect.stringContaining('PUBLIC_URL') })
    expect(resolveWith({ ...cloudEnvironment, DASHI_PUBLIC_URL: 'http://dash.example.com' })).toEqual({
      ok: false,
      reason: expect.stringContaining('https'),
    })
    expect(resolveWith({ ...cloudEnvironment, DASHI_GITHUB_APP_CLIENT_ID: '', DASHI_GITHUB_APP_CLIENT_SECRET_FILE: '' })).toEqual({
      ok: false,
      reason: expect.stringContaining('sign-in'),
    })
  })

  it('runs cloud mode on every interface, requiring sign-in and accepting only its public host name', () => {
    expect(resolveWith(cloudEnvironment)).toEqual({
      ok: true,
      settings: expect.objectContaining({
        mode: 'cloud',
        host: '0.0.0.0',
        publicUrl: 'https://dash.example.com',
        allowedHostNames: ['dash.example.com'],
        signInRequired: true,
        secureCookies: true,
        githubSignIn: {
          clientId: 'Iv23example',
          clientSecret: 'secret-from-file',
          callbackUrl: 'https://dash.example.com/api/auth/github/callback',
          allowedLogins: ['cnotv', 'friend'],
        },
      }),
    })
  })

  it('needs an allowlist whenever sign-in is configured', () => {
    expect(resolveWith({ ...cloudEnvironment, DASHI_ALLOWED_USERS: ' , ' })).toEqual({
      ok: false,
      reason: expect.stringContaining('DASHI_ALLOWED_USERS'),
    })
  })

  it('refuses half a GitHub App configuration', () => {
    expect(resolveWith({ DASHI_GITHUB_APP_CLIENT_ID: 'Iv23example' })).toEqual({ ok: false, reason: expect.stringContaining('both') })
  })

  it('offers optional sign-in in local mode', () => {
    expect(
      resolveWith({ DASHI_GITHUB_APP_CLIENT_ID: 'Iv23example', DASHI_GITHUB_APP_CLIENT_SECRET: 'secret', DASHI_ALLOWED_USERS: 'cnotv' }),
    ).toEqual({
      ok: true,
      settings: expect.objectContaining({
        signInRequired: false,
        secureCookies: false,
        githubSignIn: expect.objectContaining({ callbackUrl: 'http://localhost:4317/api/auth/github/callback' }),
      }),
    })
  })

  it('reads the master key from a file', () => {
    expect(resolveWith({ DASHI_MASTER_KEY_FILE: '/run/secrets/key' })).toEqual({
      ok: true,
      settings: expect.objectContaining({ masterKeyEncoded: 'key-from-file' }),
    })
  })

  it('treats an empty master key as unset', () => {
    expect(resolveWith({ DASHI_MASTER_KEY: '', DASHI_MASTER_KEY_FILE: '' })).toEqual({
      ok: true,
      settings: expect.objectContaining({ masterKeyEncoded: null }),
    })
  })

  it('rejects an invalid port', () => {
    expect(resolveWith({ PORT: 'eighty' }).ok).toBe(false)
  })
})

describe('isAllowedHostHeader', () => {
  const allowedHostNames = ['127.0.0.1', 'localhost', '[::1]']

  it('accepts loopback names with a port', () => {
    expect(isAllowedHostHeader('localhost:4317', allowedHostNames)).toBe(true)
    expect(isAllowedHostHeader('127.0.0.1:4317', allowedHostNames)).toBe(true)
    expect(isAllowedHostHeader('[::1]:4317', allowedHostNames)).toBe(true)
  })

  it('rejects a rebound domain and a missing header', () => {
    expect(isAllowedHostHeader('attacker.example:4317', allowedHostNames)).toBe(false)
    expect(isAllowedHostHeader(undefined, allowedHostNames)).toBe(false)
  })
})

describe('isSameOriginRequest', () => {
  it('accepts requests without an origin and from the same host', () => {
    expect(isSameOriginRequest(undefined, 'localhost:4317')).toBe(true)
    expect(isSameOriginRequest('http://localhost:4317', 'localhost:4317')).toBe(true)
  })

  it('rejects another origin', () => {
    expect(isSameOriginRequest('https://attacker.example', 'localhost:4317')).toBe(false)
  })
})

describe('settings from before the rename to Dashi', () => {
  it('reads each AGENT_DASHBOARD_* variable while its DASHI_* name is unset or empty', () => {
    expect(
      withPreviousSettingNames({ AGENT_DASHBOARD_MODE: 'cloud', AGENT_DASHBOARD_MASTER_KEY_FILE: '/run/secrets/key', DASHI_MODE: '', PORT: '80' }),
    ).toMatchObject({ DASHI_MODE: 'cloud', DASHI_MASTER_KEY_FILE: '/run/secrets/key', PORT: '80' })
    expect(withPreviousSettingNames({ AGENT_DASHBOARD_MODE: 'cloud', DASHI_MODE: 'local' })).toMatchObject({ DASHI_MODE: 'local' })
  })

  it('starts a cloud server configured only with the old names', () => {
    const oldNames = Object.fromEntries(Object.entries(cloudEnvironment).map(([name, value]) => [name.replace(/^DASHI_/, 'AGENT_DASHBOARD_'), value]))
    expect(resolveWith(oldNames)).toMatchObject({ ok: true, settings: { mode: 'cloud', publicUrl: 'https://dash.example.com' } })
  })
})
