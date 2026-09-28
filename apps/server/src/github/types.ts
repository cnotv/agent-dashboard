import type { z } from 'zod'
import type { boardResponseSchema, issueNodeSchema, pullRequestNodeSchema, rollupContextSchema } from './schema.ts'

export type BoardResponse = z.infer<typeof boardResponseSchema>
export type PullRequestNode = z.infer<typeof pullRequestNodeSchema>
export type IssueNode = z.infer<typeof issueNodeSchema>
export type RollupContext = z.infer<typeof rollupContextSchema>

export type GraphqlFetcher = (query: string, variables: Record<string, string>) => Promise<unknown>
