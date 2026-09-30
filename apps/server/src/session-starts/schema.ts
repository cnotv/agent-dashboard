import { z } from 'zod'

// GitHub's own limits on owner and repository names; nothing else can become a clone path.
const repositorySchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/),
  name: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/).refine((name) => name !== '.' && name !== '..'),
})

export const startWorkflowSchema = z.enum(['research', 'feature', 'fix', 'refactor', 'docs', 'design', '3d', 'security', 'tests', 'chore'])

export const sessionStartRequestSchema = z.object({
  repository: repositorySchema,
  issueNumber: z.number().int().positive().nullable(),
  workflow: startWorkflowSchema,
  target: z.enum(['laptop-remote-control', 'laptop-headless', 'laptop-cloud', 'cloud-routine']),
  permissionMode: z.enum(['auto', 'acceptEdits', 'dontAsk']).default('auto'),
  note: z.string().trim().max(2000).default(''),
})

export const runnerReportSchema = z.object({
  state: z.enum(['started', 'failed']),
  sessionUrl: z.string().url().startsWith('https://').max(500).nullable().default(null),
  message: z.string().max(2000).nullable().default(null),
})

export const routineSettingsBodySchema = z.object({
  routineId: z.string().regex(/^trig_[A-Za-z0-9]{8,64}$/),
  token: z.string().trim().min(20).max(512),
})

export const routineFireResponseSchema = z.object({
  claude_code_session_id: z.string(),
  claude_code_session_url: z.string().url(),
})

export const anthropicErrorSchema = z.object({ error: z.object({ message: z.string() }) })
