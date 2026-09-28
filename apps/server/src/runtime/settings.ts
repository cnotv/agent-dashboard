import type { RuntimeSettingsResult, SettingsSources } from './types.ts'

const loopbackHosts = ['127.0.0.1', 'localhost', '::1']

export const resolveRuntimeSettings = ({
  environment,
  readMasterKeyFile,
  defaultRepositoriesFile,
  defaultWebDistDirectory,
}: SettingsSources): RuntimeSettingsResult => {
  const mode = environment.AGENT_DASHBOARD_MODE ?? 'local'
  if (mode !== 'local' && mode !== 'cloud') return { ok: false, reason: `Unknown AGENT_DASHBOARD_MODE "${mode}"` }
  if (mode === 'cloud') {
    return { ok: false, reason: 'Cloud mode needs sign-in, which is not built yet. Run in local mode.' }
  }

  const host = environment.AGENT_DASHBOARD_HOST ?? '127.0.0.1'
  // A container has to listen on every interface; the compose file publishes the port on
  // 127.0.0.1 only, and this flag is how the image says that is what it is doing.
  const bindingIsPublished = environment.AGENT_DASHBOARD_PUBLISHED_ON_LOOPBACK === '1'
  if (!loopbackHosts.includes(host) && !bindingIsPublished) {
    return { ok: false, reason: `Local mode only listens on loopback, not ${host}` }
  }

  const port = Number(environment.PORT ?? '4317')
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return { ok: false, reason: `Invalid PORT "${environment.PORT}"` }

  // Compose passes an unset variable through as an empty string, which means "no key".
  const masterKeyFile = environment.AGENT_DASHBOARD_MASTER_KEY_FILE || null
  const masterKeyEncoded =
    environment.AGENT_DASHBOARD_MASTER_KEY || (masterKeyFile === null ? null : readMasterKeyFile(masterKeyFile))

  return {
    ok: true,
    settings: {
      mode,
      host,
      port,
      dataDirectory: environment.AGENT_DASHBOARD_DATA_DIR ?? 'data',
      repositoriesFile: environment.AGENT_DASHBOARD_REPOS_FILE ?? defaultRepositoriesFile,
      webDistDirectory: environment.AGENT_DASHBOARD_WEB_DIST ?? defaultWebDistDirectory,
      masterKeyEncoded,
      allowedHostNames: ['127.0.0.1', 'localhost', '[::1]'],
    },
  }
}

// Rejecting unknown Host headers is what stops a web page on another origin from reaching
// this server through DNS rebinding, since loopback binding alone does not.
export const isAllowedHostHeader = (hostHeader: string | undefined, allowedHostNames: string[]): boolean => {
  if (hostHeader === undefined) return false
  const hostName = hostHeader.startsWith('[') ? hostHeader.slice(0, hostHeader.indexOf(']') + 1) : hostHeader.split(':')[0]
  return hostName !== undefined && allowedHostNames.includes(hostName)
}

export const isSameOriginRequest = (originHeader: string | undefined, hostHeader: string | undefined): boolean => {
  if (originHeader === undefined) return true
  try {
    return new URL(originHeader).host === hostHeader
  } catch {
    return false
  }
}
