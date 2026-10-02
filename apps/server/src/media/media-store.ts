import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PreviewMediaKind } from '@dashi/contracts'
import { previewContentTypes, previewFileNames, previewMediaKinds } from './preview-artifacts.ts'
import type { PreviewFiles, StoredMedia } from './types.ts'

// An artifact never changes once uploaded, so its id is a safe cache key forever.
const artifactDirectory = (cacheDirectory: string, artifactId: number): string => join(cacheDirectory, String(artifactId))

/**
 * Reads a recording file kept from an earlier download.
 * @param cacheDirectory Where recordings are kept.
 * @param artifactId The artifact the file came from.
 * @param kind Which of the recording's files to read.
 * @returns The bytes and their content type, or null when not kept yet.
 */
export const readStoredMedia = async (cacheDirectory: string, artifactId: number, kind: PreviewMediaKind): Promise<StoredMedia | null> => {
  try {
    const bytes = await readFile(join(artifactDirectory(cacheDirectory, artifactId), previewFileNames[kind]))
    return { bytes: new Uint8Array(bytes), contentType: previewContentTypes[kind] }
  } catch {
    return null
  }
}

/**
 * Tells whether a recording was already downloaded, so a file it lacks, such as the before
 * picture of an older recording, is answered as missing instead of downloading it again.
 * @param cacheDirectory Where recordings are kept.
 * @param artifactId The artifact.
 * @returns True when its files were kept.
 */
export const hasStoredRecording = async (cacheDirectory: string, artifactId: number): Promise<boolean> =>
  access(artifactDirectory(cacheDirectory, artifactId)).then(
    () => true,
    () => false,
  )

/**
 * Keeps a recording's files on disk under the artifact's id.
 * @param cacheDirectory Where recordings are kept.
 * @param artifactId The artifact the files came from.
 * @param files The recording's files; a missing one is skipped.
 */
export const storePreviewFiles = async (cacheDirectory: string, artifactId: number, files: PreviewFiles): Promise<void> => {
  const directory = artifactDirectory(cacheDirectory, artifactId)
  await mkdir(directory, { recursive: true })
  await Promise.all(
    previewMediaKinds.flatMap((kind) => {
      const bytes = files[kind]
      return bytes === null ? [] : [writeFile(join(directory, previewFileNames[kind]), bytes)]
    }),
  )
}
