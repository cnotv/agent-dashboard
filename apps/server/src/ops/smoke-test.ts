import { requestWithHost } from './request-with-host.ts'
import type { HostedResponse, SmokeCheck, SmokeMode, SmokeResult } from './types.ts'

// Checks a running deployment from outside the container:
//   node --env-file=.env apps/server/src/ops/smoke-test.ts <local|cloud> [base URL]
// Cloud mode reads the domain and the App's client id from the same env file compose used.

const localChecks = (): SmokeCheck[] => [
  { name: 'health answers', host: 'localhost', path: '/api/health', expectedStatus: 200 },
  { name: 'the vault needs no sign-in on loopback', host: 'localhost', path: '/api/vault', expectedStatus: 200 },
  { name: 'a foreign Host is refused', host: 'attacker.example', path: '/api/vault', expectedStatus: 403 },
  { name: 'the UI is served', host: 'localhost', path: '/issues', expectedStatus: 200, bodyIncludes: '<div id="root">' },
]

const cloudChecks = (publicHost: string, clientId: string): SmokeCheck[] => [
  { name: 'health answers', host: publicHost, path: '/api/health', expectedStatus: 200 },
  {
    name: 'sign-in is required',
    host: publicHost,
    path: '/api/auth/session',
    expectedStatus: 200,
    bodyIncludes: '"signInRequired":true',
  },
  { name: 'private routes need a session', host: publicHost, path: '/api/vault', expectedStatus: 401 },
  { name: 'only the public host name is answered', host: '127.0.0.1', path: '/api/health', expectedStatus: 403 },
  {
    name: 'sign-in goes to GitHub with the App',
    host: publicHost,
    path: '/api/auth/github/start',
    expectedStatus: 302,
    locationStartsWith: `https://github.com/login/oauth/authorize?client_id=${clientId}`,
  },
]

const failureOf = (check: SmokeCheck, response: HostedResponse): string | null => {
  if (response.status !== check.expectedStatus) return `expected ${check.expectedStatus}, got ${response.status}`
  if (check.bodyIncludes !== undefined && !response.body.includes(check.bodyIncludes)) {
    return `the body does not contain ${check.bodyIncludes}`
  }
  if (check.locationStartsWith !== undefined && !(response.location ?? '').startsWith(check.locationStartsWith)) {
    return `redirects to ${response.location ?? 'nowhere'}`
  }
  return null
}

const runCheck = async (baseUrl: string, check: SmokeCheck): Promise<SmokeResult> => {
  const failure = await requestWithHost(baseUrl, check.host, check.path)
    .then((response) => failureOf(check, response))
    .catch((error: unknown) => (error instanceof Error ? error.message : String(error)))
  return { name: check.name, failure }
}

const isSmokeMode = (value: string | undefined): value is SmokeMode => value === 'local' || value === 'cloud'

const [mode, baseUrl = 'http://127.0.0.1:4317'] = process.argv.slice(2)
if (!isSmokeMode(mode)) {
  process.stderr.write('Usage: smoke-test.ts <local|cloud> [base URL]\n')
  process.exit(2)
}

const checks =
  mode === 'local'
    ? localChecks()
    : cloudChecks(process.env.AGENT_DASHBOARD_DOMAIN ?? '', process.env.AGENT_DASHBOARD_GITHUB_APP_CLIENT_ID ?? '')
const results = await Promise.all(checks.map((check) => runCheck(baseUrl, check)))
results.forEach(({ name, failure }) => process.stdout.write(failure === null ? `ok    ${name}\n` : `FAIL  ${name}: ${failure}\n`))
process.exit(results.every(({ failure }) => failure === null) ? 0 : 1)
