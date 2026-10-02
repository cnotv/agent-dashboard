import { requestWithHost } from './request-with-host.ts'

// Docker runs this inside the container. The Host header has to be one the server accepts,
// which in cloud mode is only the public host name, so it is read from the same settings.
const port = process.env.PORT ?? '4317'
const acceptedHost = new URL(process.env.DASHI_PUBLIC_URL || process.env.AGENT_DASHBOARD_PUBLIC_URL || `http://localhost:${port}`).host

requestWithHost(`http://127.0.0.1:${port}`, acceptedHost, '/api/health')
  .then((response) => process.exit(response.status === 200 ? 0 : 1))
  .catch(() => process.exit(1))
