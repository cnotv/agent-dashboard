import type { GitHubSignInSettings } from '../auth/types.ts'

export type DashboardMode = 'local' | 'cloud'

export interface RuntimeSettings {
  mode: DashboardMode
  host: string
  port: number
  dataDirectory: string
  repositoriesFile: string
  webDistDirectory: string
  masterKeyEncoded: string | null
  publicUrl: string
  allowedHostNames: string[]
  githubSignIn: GitHubSignInSettings | null
  signInRequired: boolean
  secureCookies: boolean
}

export type SettingResult<Value> = { ok: true; value: Value } | { ok: false; reason: string }

export type RuntimeSettingsResult = { ok: true; settings: RuntimeSettings } | { ok: false; reason: string }

export interface SettingsSources {
  environment: Record<string, string | undefined>
  readSecretFile: (filePath: string) => string
  defaultRepositoriesFile: string
  defaultWebDistDirectory: string
}
