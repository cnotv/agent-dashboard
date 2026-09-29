import type { GitHubSignInSettings } from '../auth/types.ts'
import type { DashboardMode, RuntimeSettingsResult, SettingResult, SettingsSources } from './types.ts'

const loopbackHosts = ['127.0.0.1', 'localhost', '::1']
const loopbackHostNames = ['127.0.0.1', 'localhost', '[::1]']
const githubCallbackPath = '/api/auth/github/callback'

// Compose passes an unset variable through as an empty string, which means "not set"; a
// `<NAME>_FILE` variable points at a Docker secret instead.
const readSecretSetting = ({ environment, readSecretFile }: SettingsSources, name: string): string | null => {
  const directValue = environment[name]
  if (directValue) return directValue
  const secretFile = environment[`${name}_FILE`]
  return secretFile ? readSecretFile(secretFile).trim() : null
}

const parseLoginList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((login) => login.trim())
    .filter((login) => login.length > 0)

const resolveMode = (value: string | undefined): SettingResult<DashboardMode> =>
  value === undefined || value === 'local' || value === 'cloud'
    ? { ok: true, value: value ?? 'local' }
    : { ok: false, reason: `Unknown AGENT_DASHBOARD_MODE "${value}"` }

const resolvePort = (value: string | undefined): SettingResult<number> => {
  const port = Number(value ?? '4317')
  return Number.isInteger(port) && port > 0 && port <= 65535 ? { ok: true, value: port } : { ok: false, reason: `Invalid PORT "${value}"` }
}

const resolvePublicUrl = (mode: DashboardMode, value: string | undefined, port: number): SettingResult<URL> => {
  if (value === undefined || value === '') {
    return mode === 'cloud'
      ? { ok: false, reason: 'Cloud mode needs AGENT_DASHBOARD_PUBLIC_URL, the https address people open' }
      : { ok: true, value: new URL(`http://localhost:${port}`) }
  }
  try {
    const publicUrl = new URL(value)
    if (mode === 'cloud' && publicUrl.protocol !== 'https:') {
      return { ok: false, reason: 'Cloud mode only runs behind https: AGENT_DASHBOARD_PUBLIC_URL must start with https://' }
    }
    return { ok: true, value: publicUrl }
  } catch {
    return { ok: false, reason: `AGENT_DASHBOARD_PUBLIC_URL "${value}" is not a URL` }
  }
}

const resolveGitHubSignIn = (sources: SettingsSources, publicUrl: URL): SettingResult<GitHubSignInSettings | null> => {
  const clientId = sources.environment.AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID || null
  const clientSecret = readSecretSetting(sources, 'AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET')
  if (clientId === null && clientSecret === null) return { ok: true, value: null }
  if (clientId === null || clientSecret === null) {
    return { ok: false, reason: 'Set both AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID and AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET, or neither' }
  }
  const allowedLogins = parseLoginList(sources.environment.AGENT_DASHBOARD_ALLOWED_USERS)
  if (allowedLogins.length === 0) {
    return { ok: false, reason: 'List the GitHub accounts that may sign in in AGENT_DASHBOARD_ALLOWED_USERS' }
  }
  return {
    ok: true,
    value: { clientId, clientSecret, callbackUrl: new URL(githubCallbackPath, publicUrl.origin).toString(), allowedLogins },
  }
}

export const resolveRuntimeSettings = (sources: SettingsSources): RuntimeSettingsResult => {
  const { environment } = sources
  const modeResult = resolveMode(environment.AGENT_DASHBOARD_MODE)
  if (!modeResult.ok) return modeResult
  const mode = modeResult.value

  const portResult = resolvePort(environment.PORT)
  if (!portResult.ok) return portResult

  const host = environment.AGENT_DASHBOARD_HOST ?? (mode === 'cloud' ? '0.0.0.0' : '127.0.0.1')
  // A container has to listen on every interface; the compose file publishes the port on
  // 127.0.0.1 only, and this flag is how the image says that is what it is doing.
  const bindingIsPublished = environment.AGENT_DASHBOARD_PUBLISHED_ON_LOOPBACK === '1'
  if (mode === 'local' && !loopbackHosts.includes(host) && !bindingIsPublished) {
    return { ok: false, reason: `Local mode only listens on loopback, not ${host}` }
  }

  const publicUrlResult = resolvePublicUrl(mode, environment.AGENT_DASHBOARD_PUBLIC_URL, portResult.value)
  if (!publicUrlResult.ok) return publicUrlResult
  const publicUrl = publicUrlResult.value

  const signInResult = resolveGitHubSignIn(sources, publicUrl)
  if (!signInResult.ok) return signInResult
  if (mode === 'cloud' && signInResult.value === null) {
    return { ok: false, reason: 'Cloud mode needs GitHub sign-in: set AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID and AGENT_DASHBOARD_GITHUB_APP_CLIENT_SECRET' }
  }

  return {
    ok: true,
    settings: {
      mode,
      host,
      port: portResult.value,
      dataDirectory: environment.AGENT_DASHBOARD_DATA_DIR ?? 'data',
      repositoriesFile: environment.AGENT_DASHBOARD_REPOS_FILE ?? sources.defaultRepositoriesFile,
      webDistDirectory: environment.AGENT_DASHBOARD_WEB_DIST ?? sources.defaultWebDistDirectory,
      masterKeyEncoded: readSecretSetting(sources, 'AGENT_DASHBOARD_MASTER_KEY'),
      publicUrl: publicUrl.origin,
      allowedHostNames: mode === 'cloud' ? [publicUrl.hostname] : loopbackHostNames,
      githubSignIn: signInResult.value,
      signInRequired: mode === 'cloud',
      secureCookies: publicUrl.protocol === 'https:',
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
