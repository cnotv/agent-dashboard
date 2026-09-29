import { request } from 'node:http'
import { text } from 'node:stream/consumers'
import type { HostedResponse } from './types.ts'

// node:http sends exactly the Host header it is given, and which Host the server accepts is
// what the healthcheck and the smoke test are about.
export const requestWithHost = (baseUrl: string, host: string, path: string, timeoutMilliseconds = 3000): Promise<HostedResponse> =>
  new Promise((resolve, reject) => {
    const target = new URL(path, baseUrl)
    const outgoing = request(target, { headers: { host }, timeout: timeoutMilliseconds }, (response) => {
      text(response)
        .then((body) => resolve({ status: response.statusCode ?? 0, location: response.headers.location ?? null, body }))
        .catch(reject)
    })
    outgoing.on('timeout', () => outgoing.destroy(new Error(`No answer from ${target.href} within ${timeoutMilliseconds} ms`)))
    outgoing.on('error', reject)
    outgoing.end()
  })
