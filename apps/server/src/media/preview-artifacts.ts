import { unzipSync } from 'fflate'
import type { Board, MediaKind, RepositoryReference } from '@dashi/contracts'
import { previewArtifactListSchema } from './schema.ts'
import type { GithubRestFetcher } from '../github/types.ts'
import type { PreviewArtifactsBySha, PreviewFiles } from './types.ts'

// The names the shared pr-preview workflow in agent-base uploads.
export const previewArtifactName = 'pr-preview'
export const previewFileNames: Record<MediaKind, string> = { image: 'screenshot.png', video: 'video.webm' }
export const previewContentTypes: Record<MediaKind, string> = { image: 'image/png', video: 'video/webm' }

const maximumArtifactBytes = 50 * 1024 * 1024

/**
 * Picks the newest unexpired pr-preview artifact of each commit from GitHub's artifact list.
 * @param rawList The artifact list as GitHub sent it.
 * @returns The artifact id for each commit SHA, empty for an unexpected answer.
 */
export const latestPreviewArtifactBySha = (rawList: unknown): PreviewArtifactsBySha => {
  const parsedList = previewArtifactListSchema.safeParse(rawList)
  if (!parsedList.success) return new Map()
  return parsedList.data.artifacts
    .filter((artifact) => artifact.name === previewArtifactName && !artifact.expired && artifact.workflow_run)
    .toSorted((first, second) => (first.created_at < second.created_at ? -1 : 1))
    .reduce((bySha, artifact) => bySha.set(artifact.workflow_run?.head_sha ?? '', artifact.id), new Map<string, number>())
}

/**
 * Lists a repository's pr-preview recordings by commit.
 * A board still loads when the token cannot read Actions: the recordings are extra, not the board.
 * @param fetchGithub The REST caller.
 * @param repository The repository.
 * @returns The artifact id for each commit SHA, empty when the token cannot read Actions.
 */
export const fetchPreviewArtifacts = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
): Promise<PreviewArtifactsBySha> => {
  try {
    const listResponse = await fetchGithub(
      `/repos/${repository.owner}/${repository.name}/actions/artifacts?name=${previewArtifactName}&per_page=100`,
    )
    return listResponse.ok ? latestPreviewArtifactBySha(await listResponse.json()) : new Map()
  } catch {
    return new Map()
  }
}

/**
 * Marks every card whose pull request head has a recording as having both a screenshot and a video.
 * @param board The board from GitHub.
 * @param artifactsBySha The recordings by commit.
 * @returns The board with media marked.
 */
export const withPreviewMedia = (board: Board, artifactsBySha: PreviewArtifactsBySha): Board => ({
  ...board,
  columns: board.columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => {
      const pullRequest = card.pullRequest
      if (pullRequest === null || pullRequest.headSha === null || !artifactsBySha.has(pullRequest.headSha)) return card
      return { ...card, pullRequest: { ...pullRequest, media: { hasImage: true, hasVideo: true } } }
    }),
  })),
})

/**
 * Takes the screenshot and the video out of a recording's zip.
 * @param zipBytes The zip GitHub served.
 * @returns The two files, each null when missing or too large.
 */
export const extractPreviewFiles = (zipBytes: Uint8Array): PreviewFiles => {
  const wantedNames = Object.values(previewFileNames)
  // The sizes come from the zip's own directory, so a file that would inflate past the cap is
  // skipped before it is inflated: a fork's pull request can upload any artifact it likes.
  const files = unzipSync(zipBytes, {
    filter: (file) => wantedNames.includes(file.name) && file.originalSize <= maximumArtifactBytes,
  })
  return { image: files[previewFileNames.image] ?? null, video: files[previewFileNames.video] ?? null }
}

/**
 * Downloads a recording's zip and takes its two files out.
 * @param fetchGithub The REST caller.
 * @param repository The repository.
 * @param artifactId The artifact to download.
 * @returns The screenshot and the video; throws when GitHub refuses or the zip is too large.
 */
export const downloadPreviewFiles = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
  artifactId: number,
): Promise<PreviewFiles> => {
  const zipResponse = await fetchGithub(`/repos/${repository.owner}/${repository.name}/actions/artifacts/${artifactId}/zip`)
  if (!zipResponse.ok) throw new Error(`GitHub answered ${zipResponse.status} for the recording`)
  if (Number(zipResponse.headers.get('content-length') ?? 0) > maximumArtifactBytes) throw new Error('The recording is too large')
  const zipBytes = new Uint8Array(await zipResponse.arrayBuffer())
  if (zipBytes.byteLength > maximumArtifactBytes) throw new Error('The recording is too large')
  return extractPreviewFiles(zipBytes)
}
