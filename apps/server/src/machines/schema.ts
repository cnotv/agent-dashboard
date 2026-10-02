import { z } from 'zod'

// What the CLI says about the machine is shown to the person approving it, so it stays plain text.
export const pairingRequestSchema = z.object({
  hostname: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._ -]+$/),
  platform: z.enum(['macos', 'linux']),
})

export const pairingApprovalSchema = z.object({
  userCode: z.string().trim().min(8).max(12),
  label: z.string().trim().min(1).max(80),
  withRunner: z.boolean(),
})
