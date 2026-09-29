import type { ConnectSnippetInput } from './types'

// Claude Code only reads telemetry settings from the user's own settings (or managed settings
// and the shell), never from a repository's .claude/settings.json, so the snippet is for
// ~/.claude/settings.json. The hook reads the first two; the rest turn on token metrics.
export const connectSnippet = ({ dashboardUrl, ingestToken }: ConnectSnippetInput): string => {
  const baseUrl = dashboardUrl.replace(/\/+$/, '')
  return JSON.stringify(
    {
      env: {
        AGENT_DASHBOARD_URL: baseUrl,
        AGENT_DASHBOARD_TOKEN: ingestToken,
        CLAUDE_CODE_ENABLE_TELEMETRY: '1',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
        OTEL_EXPORTER_OTLP_ENDPOINT: `${baseUrl}/api/telemetry`,
        OTEL_EXPORTER_OTLP_HEADERS: `Authorization=Bearer ${ingestToken}`,
      },
    },
    null,
    2,
  )
}
