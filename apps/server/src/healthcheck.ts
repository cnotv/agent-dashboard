import { request } from 'node:http'

// Docker runs this inside the container. The Host header has to be one the server accepts,
// which in cloud mode is only the public host name, so it is read from the same settings.
const port = Number(process.env.PORT ?? '4317')
const acceptedHost = new URL(process.env.AGENT_DASHBOARD_PUBLIC_URL || `http://localhost:${port}`).host

const healthRequest = request(
  { host: '127.0.0.1', port, path: '/api/health', headers: { host: acceptedHost }, timeout: 3000 },
  (response) => process.exit(response.statusCode === 200 ? 0 : 1),
)
healthRequest.on('timeout', () => healthRequest.destroy())
healthRequest.on('error', () => process.exit(1))
healthRequest.end()
