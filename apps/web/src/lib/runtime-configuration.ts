import type { RuntimeConfiguration } from './types'

export const readRuntimeConfiguration = (environment: Record<string, string | boolean | undefined>): RuntimeConfiguration => ({
  isDemoMode: environment.VITE_DEMO_MODE === '1' || environment.VITE_DEMO_MODE === 'true',
  apiBaseUrl: typeof environment.VITE_API_BASE_URL === 'string' ? environment.VITE_API_BASE_URL.replace(/\/+$/, '') : '',
})

export const runtimeConfiguration = readRuntimeConfiguration(import.meta.env)
