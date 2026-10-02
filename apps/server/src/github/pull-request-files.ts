import type { ChangedFile, RepositoryReference } from '@dashi/contracts'
import { githubErrorSchema, pullRequestFilesPageSchema } from './schema.ts'
import type { GithubRestFetcher, PullRequestFileNode, PullRequestFilesResult } from './types.ts'

const filesPerPage = 100
// GitHub lists up to 3000 files a page at a time; three pages cover any pull request worth
// reading in a drawer without spending thirty requests on a generated one.
const maximumPageCount = 3

/**
 * Turns one file from GitHub's pull request files list into the file the drawer shows.
 * @param node The file as GitHub lists it.
 * @returns The file, with null where GitHub sends no previous name or no patch.
 */
export const changedFileFromNode = (node: PullRequestFileNode): ChangedFile => ({
  filename: node.filename,
  previousFilename: node.previous_filename ?? null,
  status: node.status,
  additions: node.additions,
  deletions: node.deletions,
  patch: node.patch ?? null,
  blobUrl: node.blob_url,
})

const failureOf = async (response: Response): Promise<PullRequestFilesResult> => {
  const parsedError = githubErrorSchema.safeParse(await response.json().catch(() => null))
  return {
    ok: false,
    status: response.status,
    message: parsedError.success ? parsedError.data.message : `GitHub answered ${response.status}`,
  }
}

const readPages = async (
  fetchGithub: GithubRestFetcher,
  filesPath: string,
  pageNumber: number,
  filesSoFar: ChangedFile[],
): Promise<PullRequestFilesResult> => {
  const response = await fetchGithub(`${filesPath}?per_page=${filesPerPage}&page=${pageNumber}`)
  if (!response.ok) return failureOf(response)
  const pageFiles = pullRequestFilesPageSchema.parse(await response.json()).map(changedFileFromNode)
  const files = [...filesSoFar, ...pageFiles]
  const hasMorePages = pageFiles.length === filesPerPage
  if (hasMorePages && pageNumber < maximumPageCount) return readPages(fetchGithub, filesPath, pageNumber + 1, files)
  return { ok: true, pullRequestFiles: { files, isTruncated: hasMorePages } }
}

/**
 * Reads the files a pull request changes, each with its patch, a page at a time.
 * @param fetchGithub The REST caller, holding the reader's token.
 * @param repository The repository.
 * @param pullRequestNumber The pull request.
 * @returns The files, marked truncated past the page limit, or GitHub's reason for refusing.
 */
export const fetchPullRequestFiles = (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
  pullRequestNumber: number,
): Promise<PullRequestFilesResult> =>
  readPages(fetchGithub, `/repos/${repository.owner}/${repository.name}/pulls/${pullRequestNumber}/files`, 1, [])
