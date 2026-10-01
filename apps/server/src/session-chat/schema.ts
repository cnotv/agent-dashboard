import { z } from 'zod'

// The runner trims a transcript to its recent end before sending it, so these caps only stop a
// runner that does not.
export const chatMessageTextLimit = 4000
export const chatMessageCountLimit = 150

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/)

export const chatMessageBodySchema = z.object({ text: z.string().trim().min(1).max(8000) })

const chatMessageSchema = z.object({
  messageId: z.string().min(1).max(100),
  role: z.enum(['user', 'assistant']),
  kind: z.enum(['text', 'tool']),
  text: z.string().max(chatMessageTextLimit),
  toolName: z.string().max(100).nullable(),
  createdAt: z.string().max(40).nullable(),
})

export const runnerChatReportSchema = z.object({
  found: z.boolean(),
  messages: z.array(chatMessageSchema).max(chatMessageCountLimit),
  deliveryRoute: z.enum(['tmux', 'resume', 'none']),
  sendBlocker: z.string().max(500).nullable(),
})

export const deliveryReportSchema = z.object({
  state: z.enum(['delivered', 'failed']),
  message: z.string().max(1000).nullable(),
})
