import { z } from 'zod'

export const previewArtifactListSchema = z.object({
  artifacts: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      expired: z.boolean(),
      created_at: z.string(),
      workflow_run: z.object({ head_sha: z.string() }).nullable().optional(),
    }),
  ),
})
