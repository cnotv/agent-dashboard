import { describe, expect, it } from 'vitest'
import { isAllowedHostHeader, isSameOriginRequest, resolveRuntimeSettings } from './settings.ts'

const resolveWith = (environment: Record<string, string | undefined>) =>
  resolveRuntimeSettings({
    environment,
    readMasterKeyFile: () => 'key-from-file',
    defaultRepositoriesFile: '/repo/config/repos.json',
    defaultWebDistDirectory: '/repo/apps/web/dist',
  })

describe('resolveRuntimeSettings', () => {
  it('defaults to local mode on loopback', () => {
    expect(resolveWith({})).toEqual({
      ok: true,
      settings: expect.objectContaining({ mode: 'local', host: '127.0.0.1', port: 4317, masterKeyEncoded: null }),
    })
  })

  it('refuses a public interface in local mode', () => {
    expect(resolveWith({ AGENT_DASHBOARD_HOST: '0.0.0.0' })).toEqual({ ok: false, reason: expect.stringContaining('loopback') })
  })

  it('allows every interface when the container publishes on loopback', () => {
    expect(resolveWith({ AGENT_DASHBOARD_HOST: '0.0.0.0', AGENT_DASHBOARD_PUBLISHED_ON_LOOPBACK: '1' }).ok).toBe(true)
  })

  it('refuses cloud mode until sign-in exists', () => {
    expect(resolveWith({ AGENT_DASHBOARD_MODE: 'cloud' }).ok).toBe(false)
  })

  it('reads the master key from a file', () => {
    expect(resolveWith({ AGENT_DASHBOARD_MASTER_KEY_FILE: '/run/secrets/key' })).toEqual({
      ok: true,
      settings: expect.objectContaining({ masterKeyEncoded: 'key-from-file' }),
    })
  })

  it('treats an empty master key as unset', () => {
    expect(resolveWith({ AGENT_DASHBOARD_MASTER_KEY: '', AGENT_DASHBOARD_MASTER_KEY_FILE: '' })).toEqual({
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
