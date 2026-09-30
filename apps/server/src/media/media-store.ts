import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MediaKind } from '@agent-dashboard/contracts'
import { previewContentTypes, previewFileNames } from './preview-artifacts.ts'
import type { PreviewFiles, StoredMedia } from './types.ts'

// An artifact never changes once uploaded, so its id is a safe cache key forever.
const artifactDirectory = (cacheDirectory: string, artifactId: number): string => join(cacheDirectory, String(artifactId))

export const readStoredMedia = async (cacheDirectory: string, artifactId: number, kind: MediaKind): Promise<StoredMedia | null> => {
  try {
    const bytes = await readFile(join(artifactDirectory(cacheDirectory, artifactId), previewFileNames[kind]))
    return { bytes: new Uint8Array(bytes), contentType: previewContentTypes[kind] }
  } catch {
    return null
  }
}

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
