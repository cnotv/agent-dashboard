import { describe, expect, it } from 'vitest'
import { fetchPullRequestFiles } from './pull-request-files.ts'
import type { GithubRestFetcher } from './types.ts'

const repository = { owner: 'cnotv', name: 'generative-art' }
const filesPath = '/repos/cnotv/generative-art/pulls/7/files'

const fileNode = (filename: string) => ({
  filename,
  status: 'modified',
  additions: 2,
  deletions: 1,
  patch: '@@ -1,2 +1,3 @@\n a\n-b\n+c\n+d',
  blob_url: `https://github.com/cnotv/generative-art/blob/abc/${filename}`,
})

const fetcherOf =
  (pages: Record<number, unknown[]>, requestedPaths: string[] = []): GithubRestFetcher =>
  async (path) => {
    requestedPaths.push(path)
    const pageNumber = Number(new URL(path, 'https://api.github.com').searchParams.get('page'))
    return Response.json(pages[pageNumber] ?? [])
  }

describe('fetchPullRequestFiles', () => {
  it('maps the files, keeping a rename and a missing patch as null-safe fields', async () => {
    const renamed = { ...fileNode('src/new.ts'), status: 'renamed', previous_filename: 'src/old.ts' }
    const binary = { filename: 'logo.png', status: 'added', additions: 0, deletions: 0, blob_url: 'https://github.com/x/blob/abc/logo.png' }
    const result = await fetchPullRequestFiles(fetcherOf({ 1: [renamed, binary] }), repository, 7)
    expect(result).toEqual({
      ok: true,
      pullRequestFiles: {
        isTruncated: false,
        files: [
          {
            filename: 'src/new.ts',
            previousFilename: 'src/old.ts',
            status: 'renamed',
            additions: 2,
            deletions: 1,
            patch: renamed.patch,
            blobUrl: renamed.blob_url,
          },
          {
            filename: 'logo.png',
            previousFilename: null,
            status: 'added',
            additions: 0,
            deletions: 0,
            patch: null,
            blobUrl: binary.blob_url,
          },
        ],
      },
    })
  })

  it('reads further pages while they are full, and stops at three', async () => {
    const fullPage = (pageNumber: number) => Array.from({ length: 100 }, (_, index) => fileNode(`p${pageNumber}/f${index}.ts`))
    const requestedPaths: string[] = []
    const result = await fetchPullRequestFiles(fetcherOf({ 1: fullPage(1), 2: fullPage(2), 3: fullPage(3) }, requestedPaths), repository, 7)
    expect(requestedPaths).toEqual([1, 2, 3].map((pageNumber) => `${filesPath}?per_page=100&page=${pageNumber}`))
    expect(result.ok && result.pullRequestFiles.files.length).toBe(300)
    expect(result.ok && result.pullRequestFiles.isTruncated).toBe(true)
  })

  it("passes on GitHub's reason when it refuses", async () => {
    const refusing: GithubRestFetcher = async () => Response.json({ message: 'Not Found' }, { status: 404 })
    expect(await fetchPullRequestFiles(refusing, repository, 7)).toEqual({ ok: false, status: 404, message: 'Not Found' })
  })
})
