import type { RuntimeConfiguration } from './types'

/**
 * Reads demo mode and the API address from the build's environment.
 * @param environment The Vite environment variables.
 * @returns The runtime configuration.
 */
export const readRuntimeConfiguration = (environment: Record<string, string | boolean | undefined>): RuntimeConfiguration => ({
  isDemoMode: environment.VITE_DEMO_MODE === '1' || environment.VITE_DEMO_MODE === 'true',
  apiBaseUrl: typeof environment.VITE_API_BASE_URL === 'string' ? environment.VITE_API_BASE_URL.replace(/\/+$/, '') : '',
})

export const runtimeConfiguration = readRuntimeConfiguration(import.meta.env)
