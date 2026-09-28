import { describe, expect, it } from 'vitest'
import { readRuntimeConfiguration } from './runtime-configuration'

describe('readRuntimeConfiguration', () => {
  it('talks to its own origin by default', () => {
    expect(readRuntimeConfiguration({})).toEqual({ isDemoMode: false, apiBaseUrl: '' })
  })

  it('turns demo mode on', () => {
    expect(readRuntimeConfiguration({ VITE_DEMO_MODE: '1' }).isDemoMode).toBe(true)
    expect(readRuntimeConfiguration({ VITE_DEMO_MODE: 'true' }).isDemoMode).toBe(true)
    expect(readRuntimeConfiguration({ VITE_DEMO_MODE: '0' }).isDemoMode).toBe(false)
  })

  it('drops trailing slashes from the server address', () => {
    expect(readRuntimeConfiguration({ VITE_API_BASE_URL: 'https://dashboard.example//' }).apiBaseUrl).toBe(
      'https://dashboard.example',
    )
  })
})
