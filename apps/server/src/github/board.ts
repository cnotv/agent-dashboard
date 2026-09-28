import type { Board, CheckGate, IssueSummary, PullRequestSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { boardQuery, boardResponseSchema } from './schema.ts'
import { buildBoard, gateStateFromCheckRun, gateStateFromStatusContext, summariseGates } from './status.ts'
import type { GraphqlFetcher, IssueNode, PullRequestNode, RollupContext } from './types.ts'

const githubGraphqlUrl = 'https://api.github.com/graphql'

export const gateFromRollupContext = (context: RollupContext): CheckGate =>
  context.__typename === 'CheckRun'
    ? { name: context.name, state: gateStateFromCheckRun(context.status, context.conclusion), url: context.detailsUrl }
    : { name: context.context, state: gateStateFromStatusContext(context.state), url: context.targetUrl }

export const mapPullRequestNode = (node: PullRequestNode): PullRequestSummary => {
  const headCommit = node.commits.nodes[0]?.commit ?? null
  const gates = (headCommit?.statusCheckRollup?.contexts.nodes ?? [])
    .flatMap((context) => (context === null ? [] : [gateFromRollupContext(context)]))
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    isDraft: node.isDraft,
    headRefName: node.headRefName,
    headSha: headCommit?.oid ?? null,
    reviewDecision: node.reviewDecision,
    mergeable: node.mergeable,
    body: node.body,
    updatedAt: node.updatedAt,
    gates,
    gateSummary: summariseGates(gates),
  }
}

export const mapIssueNode = (node: IssueNode): IssueSummary => ({
  number: node.number,
  title: node.title,
  url: node.url,
  updatedAt: node.updatedAt,
  labels: node.labels.nodes,
  linkedPullRequestNumbers: node.closedByPullRequestsReferences.nodes.map((reference) => reference.number),
})

export const createGithubGraphqlFetcher =
  (token: string): GraphqlFetcher =>
  async (query, variables) => {
    const githubResponse = await fetch(githubGraphqlUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'agent-dashboard' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000),
    })
    if (!githubResponse.ok) throw new Error(`GitHub answered ${githubResponse.status}`)
    return githubResponse.json()
  }

export const fetchRepositoryBoard = async (fetchGraphql: GraphqlFetcher, repository: RepositoryReference): Promise<Board> => {
  const rawResponse = await fetchGraphql(boardQuery, { owner: repository.owner, name: repository.name })
  const parsedResponse = boardResponseSchema.safeParse(rawResponse)
  if (!parsedResponse.success) throw new Error(`Unexpected GitHub response for ${repository.owner}/${repository.name}`)
  const { issues, pullRequests } = parsedResponse.data.data.repository
  return buildBoard(repository, issues.nodes.map(mapIssueNode), pullRequests.nodes.map(mapPullRequestNode), new Date().toISOString())
}
