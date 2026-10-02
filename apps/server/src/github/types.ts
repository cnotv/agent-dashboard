import type { z } from 'zod'
import type { CreatedIssue, IssueSummary, PullRequestFiles, PullRequestSummary } from '@dashi/contracts'
import type {
  boardResponseSchema,
  closedIssueNodeSchema,
  issueNodeSchema,
  pullRequestFileSchema,
  pullRequestNodeSchema,
  rollupContextSchema,
} from './schema.ts'

export type BoardResponse = z.infer<typeof boardResponseSchema>
export type PullRequestNode = z.infer<typeof pullRequestNodeSchema>
export type IssueNode = z.infer<typeof issueNodeSchema>
export type ClosedIssueNode = z.infer<typeof closedIssueNodeSchema>
export type RollupContext = z.infer<typeof rollupContextSchema>
export type PullRequestFileNode = z.infer<typeof pullRequestFileSchema>

export type GraphqlFetcher = (query: string, variables: Record<string, string | number>) => Promise<unknown>

export interface GithubRestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  body?: unknown
}

export type GithubRestFetcher = (path: string, request?: GithubRestRequest) => Promise<Response>

export interface PullRequestToMerge {
  number: number
  title: string
  headSha: string
}

export type PullRequestActionResult = { ok: true } | { ok: false; status: number; message: string }

export type IssueCreationResult = { ok: true; issue: CreatedIssue } | { ok: false; status: number; message: string }

export type PullRequestFilesResult = { ok: true; pullRequestFiles: PullRequestFiles } | { ok: false; status: number; message: string }

export interface ClosedIssue {
  issue: IssueSummary
  pullRequest: PullRequestSummary | null
}
