import type { SecretDefinitionWithTester } from './types.ts'

export const secretDefinitions: SecretDefinitionWithTester[] = [
  {
    name: 'github-token',
    label: 'GitHub token',
    description: 'Reads issues, pull requests, check runs and workflow artifacts.',
    tester: { url: 'https://api.github.com/user', credentialHeader: 'bearer', extraHeaders: { 'User-Agent': 'agent-dashboard' } },
  },
  {
    name: 'anthropic-api-key',
    label: 'Anthropic API key',
    description: 'Runs Claude sessions billed per token instead of on the subscription.',
    tester: { url: 'https://api.anthropic.com/v1/models', credentialHeader: 'x-api-key', extraHeaders: { 'anthropic-version': '2023-06-01' } },
  },
  {
    name: 'openai-api-key',
    label: 'OpenAI API key',
    description: 'Runs Codex sessions billed per token instead of on the ChatGPT subscription.',
    tester: { url: 'https://api.openai.com/v1/models', credentialHeader: 'bearer', extraHeaders: {} },
  },
  {
    name: 'openrouter-api-key',
    label: 'OpenRouter API key',
    description: 'Routes Claude or Codex sessions through OpenRouter models.',
    tester: { url: 'https://openrouter.ai/api/v1/key', credentialHeader: 'bearer', extraHeaders: {} },
  },
]
