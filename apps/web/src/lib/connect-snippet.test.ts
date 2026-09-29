import { describe, expect, it } from 'vitest'
import { connectSnippet } from './connect-snippet'

describe('connectSnippet', () => {
  it('points the hooks and the metrics exporter at the dashboard with the same token', () => {
    const settings: unknown = JSON.parse(connectSnippet({ dashboardUrl: 'https://agents.example.com/', ingestToken: 'adt_example' }))
    expect(settings).toEqual({
      env: {
        AGENT_DASHBOARD_URL: 'https://agents.example.com',
        AGENT_DASHBOARD_TOKEN: 'adt_example',
        CLAUDE_CODE_ENABLE_TELEMETRY: '1',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'https://agents.example.com/api/telemetry',
        OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Bearer adt_example',
      },
    })
  })
})
