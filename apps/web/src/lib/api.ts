import type {
  Board,
  RepositoryReference,
  SecretSummary,
  SecretTestResult,
  VaultState,
} from '@agent-dashboard/contracts'

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorBody: unknown = await response.json()
    return typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody && typeof errorBody.error === 'string'
      ? errorBody.error
      : `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

const requestJson = async <ResponseBody>(path: string, init: RequestInit = {}): Promise<ResponseBody> => {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response.status === 204 ? (undefined as ResponseBody) : ((await response.json()) as ResponseBody)
}

const sendJson = <ResponseBody>(method: string, path: string, body: unknown = {}): Promise<ResponseBody> =>
  requestJson<ResponseBody>(path, { method, body: JSON.stringify(body) })

export const dashboardApi = {
  readVault: () => requestJson<VaultState>('/api/vault'),
  setUpVault: (passphrase: string) => sendJson<VaultState>('POST', '/api/vault/setup', { passphrase }),
  unlockVault: (passphrase: string) => sendJson<VaultState>('POST', '/api/vault/unlock', { passphrase }),
  lockVault: () => sendJson<VaultState>('POST', '/api/vault/lock'),
  listSecrets: () => requestJson<SecretSummary[]>('/api/secrets'),
  saveSecret: (name: string, value: string) => sendJson<void>('PUT', `/api/secrets/${encodeURIComponent(name)}`, { value }),
  deleteSecret: (name: string) => sendJson<void>('DELETE', `/api/secrets/${encodeURIComponent(name)}`),
  testSecret: (name: string) => sendJson<SecretTestResult>('POST', `/api/secrets/${encodeURIComponent(name)}/test`),
  listRepositories: () => requestJson<RepositoryReference[]>('/api/repositories'),
  readBoard: (repository: RepositoryReference, refresh: boolean) =>
    requestJson<Board>(
      `/api/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/board${refresh ? '?refresh=1' : ''}`,
    ),
}
