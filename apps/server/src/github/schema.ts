import { z } from 'zod'

const checkRunContextSchema = z.object({
  __typename: z.literal('CheckRun'),
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  detailsUrl: z.string().nullable(),
})

const statusContextSchema = z.object({
  __typename: z.literal('StatusContext'),
  context: z.string(),
  state: z.string(),
  targetUrl: z.string().nullable(),
})

export const rollupContextSchema = z.discriminatedUnion('__typename', [checkRunContextSchema, statusContextSchema])

export const pullRequestNodeSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  isDraft: z.boolean(),
  headRefName: z.string(),
  reviewDecision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED']).nullable(),
  mergeable: z.enum(['MERGEABLE', 'CONFLICTING', 'UNKNOWN']),
  body: z.string(),
  updatedAt: z.string(),
  commits: z.object({
    nodes: z.array(
      z.object({
        commit: z.object({
          oid: z.string(),
          statusCheckRollup: z
            .object({ contexts: z.object({ nodes: z.array(rollupContextSchema.nullable()) }) })
            .nullable(),
        }),
      }),
    ),
  }),
})

export const issueNodeSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  updatedAt: z.string(),
  labels: z.object({ nodes: z.array(z.object({ name: z.string(), color: z.string() })) }),
  closedByPullRequestsReferences: z.object({ nodes: z.array(z.object({ number: z.number() })) }),
})

export const pullRequestBodyHtmlQuery = `
  query PullRequestBodyHtml($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        bodyHTML
      }
    }
  }
`

export const pullRequestBodyHtmlResponseSchema = z.object({
  data: z.object({
    repository: z.object({ pullRequest: z.object({ bodyHTML: z.string() }).nullable() }),
  }),
})

export const boardResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      issues: z.object({ nodes: z.array(issueNodeSchema) }),
      pullRequests: z.object({ nodes: z.array(pullRequestNodeSchema) }),
    }),
  }),
})

export const boardQuery = `
  query Board($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      issues(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          number
          title
          url
          updatedAt
          labels(first: 10) { nodes { name color } }
          closedByPullRequestsReferences(first: 5, includeClosedPrs: false) { nodes { number } }
        }
      }
      pullRequests(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          number
          title
          url
          isDraft
          headRefName
          reviewDecision
          mergeable
          body
          updatedAt
          commits(last: 1) {
            nodes {
              commit {
                oid
                statusCheckRollup {
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun { name status conclusion detailsUrl }
                      ... on StatusContext { context state targetUrl }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export const githubErrorSchema = z.object({ message: z.string() })
