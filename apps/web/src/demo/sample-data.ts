import type { RepositoryReference, SecretSummary, SignedInUser } from '@agent-dashboard/contracts'

export const demoUser: SignedInUser = { login: 'demo', avatarUrl: '' }

export const sampleRepositories: RepositoryReference[] = [
  { owner: 'cnotv', name: 'example' },
  { owner: 'cnotv', name: 'example-api' },
]

export const sampleSecrets: SecretSummary[] = [
  {
    name: 'github-token',
    label: 'GitHub token',
    description: 'Reads issues, pull requests, check runs and workflow artifacts when nobody is signed in with GitHub.',
    isSet: true,
    lastFour: 'demo',
    updatedAt: '2026-09-28T00:00:00Z',
  },
  {
    name: 'anthropic-api-key',
    label: 'Anthropic API key',
    description: 'Runs Claude sessions billed per token instead of on the subscription.',
    isSet: false,
    lastFour: null,
    updatedAt: null,
  },
  {
    name: 'openai-api-key',
    label: 'OpenAI API key',
    description: 'Runs Codex sessions billed per token instead of on the ChatGPT subscription.',
    isSet: false,
    lastFour: null,
    updatedAt: null,
  },
  {
    name: 'openrouter-api-key',
    label: 'OpenRouter API key',
    description: 'Routes Claude or Codex sessions through OpenRouter models.',
    isSet: false,
    lastFour: null,
    updatedAt: null,
  },
]
