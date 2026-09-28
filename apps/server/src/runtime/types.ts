export type DashboardMode = 'local' | 'cloud'

export interface RuntimeSettings {
  mode: DashboardMode
  host: string
  port: number
  dataDirectory: string
  repositoriesFile: string
  webDistDirectory: string
  masterKeyEncoded: string | null
  allowedHostNames: string[]
}

export type RuntimeSettingsResult = { ok: true; settings: RuntimeSettings } | { ok: false; reason: string }

export interface SettingsSources {
  environment: Record<string, string | undefined>
  readMasterKeyFile: (filePath: string) => string
  defaultRepositoriesFile: string
  defaultWebDistDirectory: string
}
