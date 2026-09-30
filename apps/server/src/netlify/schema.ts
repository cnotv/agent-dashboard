import { z } from 'zod'

export const netlifySiteSchema = z.object({
  name: z.string(),
  ssl_url: z.string().nullable().optional(),
  url: z.string(),
  admin_url: z.string(),
  build_settings: z
    .object({
      provider: z.string().nullable().optional(),
      repo_path: z.string().nullable().optional(),
      installation_id: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const netlifySitesSchema = z.array(netlifySiteSchema)

export const netlifyErrorSchema = z.object({ message: z.string() })

export const githubRepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  private: z.boolean(),
  default_branch: z.string(),
})
