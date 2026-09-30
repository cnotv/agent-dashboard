import type { z } from 'zod'
import type { NetlifyStatus } from '@agent-dashboard/contracts'
import type { githubRepositorySchema, netlifySiteSchema } from './schema.ts'

export type NetlifySite = z.infer<typeof netlifySiteSchema>
export type GithubRepositoryDetails = z.infer<typeof githubRepositorySchema>

export interface NetlifyRequest {
  method: 'GET' | 'POST'
  body?: unknown
}

export type NetlifyFetcher = (path: string, request?: NetlifyRequest) => Promise<Response>

export type NetlifyEnableResult = { ok: true; status: NetlifyStatus } | { ok: false; status: number; message: string }
