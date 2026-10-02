import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MediaKind } from '@dashi/contracts'
import { previewContentTypes, previewFileNames } from './preview-artifacts.ts'
import type { PreviewFiles, StoredMedia } from './types.ts'

// An artifact never changes once uploaded, so its id is a safe cache key forever.
const artifactDirectory = (cacheDirectory: string, artifactId: number): string => join(cacheDirectory, String(artifactId))

/**
 * Reads a recording file kept from an earlier download.
 * @param cacheDirectory Where recordings are kept.
 * @param artifactId The artifact the file came from.
 * @param kind Whether to read the screenshot or the video.
 * @returns The bytes and their content type, or null when not kept yet.
 */
export const readStoredMedia = async (cacheDirectory: string, artifactId: number, kind: MediaKind): Promise<StoredMedia | null> => {
  try {
    const bytes = await readFile(join(artifactDirectory(cacheDirectory, artifactId), previewFileNames[kind]))
    return { bytes: new Uint8Array(bytes), contentType: previewContentTypes[kind] }
  } catch {
    return null
  }
}

/**
 * Keeps a recording's screenshot and video on disk under the artifact's id.
 * @param cacheDirectory Where recordings are kept.
 * @param artifactId The artifact the files came from.
 * @param files The screenshot and video; a missing one is skipped.
 */
export const storePreviewFiles = async (cacheDirectory: string, artifactId: number, files: PreviewFiles): Promise<void> => {
  const directory = artifactDirectory(cacheDirectory, artifactId)
  await mkdir(directory, { recursive: true })
  await Promise.all(
    (['image', 'video'] as const).flatMap((kind) => {
      const bytes = files[kind]
      return bytes === null ? [] : [writeFile(join(directory, previewFileNames[kind]), bytes)]
    }),
  )
}
